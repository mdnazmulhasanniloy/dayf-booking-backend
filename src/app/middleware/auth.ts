import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../utils/catchAsync';
import AppError from '../error/AppError';
import config from '../config/index';
import { User } from '../modules/user/user.models';

const auth = (...userRoles: string[]) => {
  return catchAsync(async (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'you are not authorized!');
    }
    let decode;
    try {
      decode = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as JwtPayload;
    } catch (err) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'unauthorized');
    }
    const { role, userId } = decode;
    const isUserExist = await User.IsUserExistId(userId);
    if (!isUserExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'user not found');
    }
    if (isUserExist.status === 'blocked') {
      throw new AppError(httpStatus.FORBIDDEN, 'Your account is blocked');
    }
    if (
      isUserExist.status === 'suspended' &&
      isUserExist.suspendedUntil &&
      isUserExist.suspendedUntil > new Date()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `Your account is suspended until ${isUserExist.suspendedUntil.toISOString()}`,
      );
    }
    if (
      isUserExist.status === 'suspended' &&
      (!isUserExist.suspendedUntil ||
        isUserExist.suspendedUntil <= new Date())
    ) {
      await User.updateOne(
        { _id: isUserExist._id },
        {
          $set: { status: 'active' },
          $unset: { suspendedUntil: '', suspensionReason: '' },
        },
      );
    }
    if (userRoles && !userRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }
    req.user = decode;
    next();
  });
};
export default auth;
