import { Types } from 'mongoose';
import AppError from '../../error/AppError';
import { ApartmentDraft } from './apartmentDraft.models';
import Apartment from '../apartment/apartment.models';
import { APARTMENT_STATUS } from '../apartment/apartment.constants';
import { uploadManyToS3, uploadToS3 } from '../../utils/s3';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';
import { notificationQueue } from '../../redis';
import { modeType } from '../notification/notification.interface';
const editableFields = new Set([
  'name',
  'price',
  'images',
  'banner',
  'shortDescription',
  'description',
  'maxGuests',
  'totalBadRooms',
  'bads',
  'roomSize',
  'address',
  'facilities',
  'othersFacilities',
  'location',
  'municipality',
  'landmark',
  'bathrooms',
  'checkInTime',
  'checkOutTime',
  'minimumNights',
  'houseRules',
  'cancellationPolicy',
  'propertyType',
  'wilaya',
]);

export const pickDraftData = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Draft data must be an object');
  }
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => editableFields.has(key)),
  );
};

const ownerFilter = (id: string, author: string) => {
  if (!/^[a-fA-F0-9]{24}$/.test(id))
    throw new AppError(400, 'Invalid draft ID');
  return { _id: new Types.ObjectId(id), author };
};

// Return apartment-shaped details, including drafts saved in the old format.
const draftDetails = (draft: any) => {
  const { data, ...fields } = draft.toObject();
  return { ...fields, ...(data ? pickDraftData(data) : {}) };
};

const requireDraft = async (id: string, author: string) => {
  const draft = await ApartmentDraft.findOne(ownerFilter(id, author));
  if (!draft) throw new AppError(404, 'Draft not found');
  return draft;
};

const payloadWithImages = async (body: unknown, uploaded: any) => {
  const data = pickDraftData(body ?? {});
  if (uploaded?.images?.length) {
    data.images = await uploadManyToS3(
      uploaded.images.map((file: any) => ({ file, path: 'images/apartment' })),
    );
  }
  if (uploaded?.banner?.length) {
    data.banner = await uploadToS3({
      file: uploaded.banner[0],
      fileName: `images/apartment/banner/${new Types.ObjectId()}`,
    });
  }
  return data;
};

const createDraft = async (author: string, body: unknown, files?: unknown) => {
  const data = await payloadWithImages(body, files);
  const draft = await ApartmentDraft.create({
    author: author,
    ...data,
  });

  return draft;
};

const getDrafts = async (author: string, query: Record<string, unknown>) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AppError(
      400,
      'page must be positive and limit must be between 1 and 100',
    );
  }
  const filter = { author: author };
  const [data, total] = await Promise.all([
    ApartmentDraft.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ApartmentDraft.countDocuments(filter),
  ]);

  return { meta: { page, limit, total }, data: data.map(draftDetails) };
};

const getDraftById = async (id: string, author: string) => {
  const draft = await requireDraft(id, author);

  return draftDetails(draft);
};

const updateDraft = async (
  id: string,
  author: string,
  body: unknown,
  files?: unknown,
) => {
  const existing = await requireDraft(id, author);
  const data = await payloadWithImages(body, files);
  const updates = {
    ...(existing.data ? pickDraftData(existing.data) : {}),
    ...data,
  };
  const draft = await ApartmentDraft.findOneAndUpdate(
    ownerFilter(id, author),
    { $set: updates, $unset: { data: 1 } },
    { new: true, runValidators: true },
  );
  if (!draft) throw new AppError(404, 'Draft not found');

  return draft;
};

const deleteDraft = async (id: string, author: string) => {
  const draft = await ApartmentDraft.findOneAndDelete(ownerFilter(id, author));
  if (!draft) throw new AppError(404, 'Draft not found');

  return null;
};

const submitDraft = async (id: string, author: string) => {
  const filter = ownerFilter(id, author);
  const session = await ApartmentDraft.startSession();
  let apartment;
  try {
    apartment = await session.withTransaction(async () => {
      // Removing and creating in one transaction prevents duplicate submissions.
      const draft = await ApartmentDraft.findOneAndDelete(filter, {
        session,
      });
      if (!draft) throw new AppError(404, 'Draft not found');
      const [created] = await Apartment.create(
        [
          {
            ...pickDraftData(draftDetails(draft)),
            author: author,
            status: APARTMENT_STATUS.pending,
          },
        ],
        { session },
      );
      return created;
    });
  } finally {
    await session.endSession();
  }
  if (!apartment) throw new AppError(500, 'Draft submission failed');
  const submitted = apartment;
  void (async () => {
    const admin = await User.findOne({ role: USER_ROLE.admin }).select('_id');
    if (admin)
      await notificationQueue.add('new_notification', {
        receiver: admin._id,
        message: 'New property awaiting approval',
        description: `${submitted.name} has been submitted and is ready for your review.`,
        refference: submitted._id,
        model_type: modeType.Apartment,
      });
  })().catch(error =>
    console.error('Draft submission notification failed:', error),
  );

  return apartment;
};

export const apartmentDraftService = {
  createDraft,
  getDrafts,
  getDraftById,
  updateDraft,
  deleteDraft,
  submitDraft,
};
