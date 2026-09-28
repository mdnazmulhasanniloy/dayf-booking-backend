import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { apartmentDraftService } from './apartmentDraft.service';

const createDraft = catchAsync(async (req, res) => {
  const data = await apartmentDraftService.createDraft(
    req.user.userId,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Draft saved',
    data,
  });
});

const getDrafts = catchAsync(async (req, res) => {
  const data = await apartmentDraftService.getDrafts(
    req.user.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drafts fetched',
    data,
  });
});

const getDraftById = catchAsync(async (req, res) => {
  const data = await apartmentDraftService.getDraftById(
    req.params.id,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Draft fetched',
    data,
  });
});

const updateDraft = catchAsync(async (req, res) => {
  const data = await apartmentDraftService.updateDraft(
    req.params.id,
    req.user.userId,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Draft updated',
    data,
  });
});

const deleteDraft = catchAsync(async (req, res) => {
  const data = await apartmentDraftService.deleteDraft(
    req.params.id,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Draft deleted',
    data,
  });
});

const submitDraft = catchAsync(async (req, res) => {
  const data = await apartmentDraftService.submitDraft(
    req.params.id,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Draft submitted for approval',
    data,
  });
});

export const apartmentDraftController = {
  createDraft,
  getDrafts,
  getDraftById,
  updateDraft,
  deleteDraft,
  submitDraft,
};
