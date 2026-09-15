import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { apartmentService } from './apartment.service';
import sendResponse from '../../utils/sendResponse';
import { notificationQueue } from '../../redis';
import { modeType } from '../notification/notification.interface';
import { APARTMENT_STATUS } from './apartment.constants';
import { sendMailQueue } from '../../redis';
import { User } from '../user/user.models';
import fs from 'fs';
import path from 'path';
import config from '../../config';

const renderApartmentStatusEmail = (
  templateName: string,
  values: Record<string, string>,
) => {
  const templatePath = path.join(
    __dirname,
    `../../../../public/view/apartment/${templateName}`,
  );

  return Object.entries(values).reduce(
    (html, [key, value]) =>
      html
        .split(`{{${key}}}`)
        .join(
          value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;'),
        ),
    fs.readFileSync(templatePath, 'utf8'),
  );
};

const queueApartmentStatusEmail = async (
  apartment: { _id: unknown; author: unknown; name?: string; createdAt?: Date },
  status: 'approved' | 'declined',
) => {
  const owner = await User.findById(apartment.author).select('name email');
  if (!owner?.email) return;

  const clientUrl = (config.client_Url || '').replace(/\/$/, '');
  const apartmentName = apartment.name || 'your submitted property';
  const apartmentId = String(apartment._id);
  const isApproved = status === 'approved';
  const html = renderApartmentStatusEmail(
    isApproved
      ? 'approved_apartment_request_verify.html'
      : 'rejected_apartment_request_verify.html',
    {
      hostName: owner.name || 'Host',
      apartmentName,
      submittedDate: apartment.createdAt
        ? apartment.createdAt.toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB'),
      listingUrl: clientUrl ? `${clientUrl}/apartment/${apartmentId}` : '#',
      editListingUrl: clientUrl
        ? `${clientUrl}/apartment/${apartmentId}`
        : '#',
      rejectionReason:
        'Please review the listing details and submit it again after making the necessary updates.',
    },
  );

  await sendMailQueue.add('new_mail', {
    email: owner.email,
    subject: isApproved
      ? 'Your DAYF apartment listing has been approved'
      : 'Your DAYF apartment listing needs changes',
    html,
  });
};

const createApartment = catchAsync(async (req: Request, res: Response) => {
  req.body.author = req?.user?.userId;
  const result = await apartmentService.createApartment(req.body, req.files);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Apartment created successfully',
    data: result,
  });
});

const getAllApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.getAllApartment(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All apartment fetched successfully',
    data: result,
  });
});

const getMyApartment = catchAsync(async (req: Request, res: Response) => {
  req.query.author = req?.user?.userId;
  const result = await apartmentService.getAllApartment(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All apartment fetched successfully',
    data: result,
  });
});

const getApartmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.getApartmentById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment fetched successfully',
    data: result,
  });
});

const updateApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.updateApartment(
    req.params.id,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment updated successfully',
    data: result,
  });
});

const approvedApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.updateApartment(req.params.id, {
    status: APARTMENT_STATUS.approved,
  });

  const ownerNotification = {
    receiver: result.author,
    message: 'Property approved',
    description: `Your property, ${result.name || 'the submitted property'}, has been approved and is now available for bookings.`,
    refference: result?._id,
    model_type: modeType.Apartment,
  };

  await notificationQueue.add('new_notification', ownerNotification);
  await queueApartmentStatusEmail(result, APARTMENT_STATUS.approved);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment updated successfully',
    data: result,
  });
});
const declinedApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.updateApartment(req.params.id, {
    status: APARTMENT_STATUS.declined,
  });

  const ownerNotification = {
    receiver: result.author,
    message: 'Property approval declined',
    description: `Your property, ${result.name || 'the submitted property'}, was not approved. Please review the listing details and submit it again after making the necessary updates.`,
    refference: result?._id,
    model_type: modeType.Apartment,
  };

  await notificationQueue.add('new_notification', ownerNotification);
  await queueApartmentStatusEmail(result, APARTMENT_STATUS.declined);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment updated successfully',
    data: result,
  });
});

const deleteApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.deleteApartment(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment deleted successfully',
    data: result,
  });
});

export const apartmentController = {
  createApartment,
  getAllApartment,
  getApartmentById,
  updateApartment,
  deleteApartment,
  getMyApartment,
  approvedApartment,
  declinedApartment,
};
