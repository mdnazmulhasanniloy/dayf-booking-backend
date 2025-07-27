import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import {
  IJwtPayload,
  TChangePassword,
  TLogin,
  TResetPassword,
} from './auth.interface';
import config from '../../config';
import {
  createToken, 
  verifyToken,
} from './auth.utils';
import { generateOtp } from '../../utils/otpGenerator';
import moment from 'moment';
import { sendEmail } from '../../utils/mailSender';
import bcrypt from 'bcrypt';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.models';
import path from 'path';
import fs from 'fs';
import { REGISTER_WITH, USER_ROLE } from '../user/user.constants';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import firebaseAdmin from '../../utils/firebase';

// Login
const login = async (payload: TLogin) => {
  payload.email = payload?.email?.trim().toLowerCase();
  const user: IUser | null = await User.isUserExist(payload?.email);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  if (user?.registerWith !== REGISTER_WITH.credentials) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This account is registered with ${user.registerWith}, so you should try logging in using that method.`,
    );
  }

  if (!(await User.isPasswordMatched(payload.password, user.password))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password does not match');
  }

  if (!user?.verification?.status) {
    throw new AppError(httpStatus.FORBIDDEN, 'User account is not verified');
  }

  const jwtPayload: { userId: string; role: string } = {
    userId: user?._id?.toString() as string,
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  return {
    user,
    accessToken,
    refreshToken,
  };
};

// register with google
const registerWithGoogle = async (payload: any) => {
  console.log();
  try {
    const decodedToken: DecodedIdToken | null = await firebaseAdmin
      .auth()
      .verifyIdToken(payload?.token); // Verify the token

    console.log(JSON.stringify(decodedToken));
    if (!decodedToken)
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid token');
    if (!decodedToken?.email_verified) {
      throw new AppError(
        httpStatus?.BAD_REQUEST,
        'your mail not verified from google',
      );
    }

    const existingUser = await User.isUserExist(decodedToken?.email as string);

    if (existingUser) {
      if (existingUser?.registerWith !== REGISTER_WITH.google) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `This account is registered with ${existingUser.registerWith}, so you should try logging in using that method.`,
        );
      }

      if (existingUser?.isDeleted) {
        throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
      }

      const jwtPayload: { userId: string; role: string } = {
        userId: existingUser?._id?.toString() as string,
        role: existingUser?.role,
      };

      const accessToken = createToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.jwt_access_expires_in as string,
      );

      const refreshToken = createToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.jwt_refresh_expires_in as string,
      );

      return {
        user: existingUser,
        accessToken,
        refreshToken,
      };
    }

    const user = await User.create({
      name: decodedToken?.name,
      email: decodedToken?.email,
      profile: decodedToken?.picture,
      phoneNumber: decodedToken?.phone_number,
      registerWith: REGISTER_WITH.google,
      role: payload?.role ?? USER_ROLE.user,
      verification: {
        status: true,
      },
    });

    if (!user) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create user',
      );
    }

    const jwtPayload: { userId: string; role: string } = {
      userId: user?._id?.toString() as string,
      role: user?.role,
    };

    const accessToken = createToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.jwt_access_expires_in as string,
    );

    const refreshToken = createToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.jwt_refresh_expires_in as string,
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    console.error('Error in registerWithGoogle:', error);
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

const registerWithFacebook = async (payload: any) => {
  try {
    const decodedToken: DecodedIdToken | null = await firebaseAdmin
      .auth()
      .verifyIdToken(payload?.token);

    console.log(JSON.stringify(decodedToken));
    if (!decodedToken)
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid token');
    if (!decodedToken?.email_verified) {
      throw new AppError(
        httpStatus?.BAD_REQUEST,
        'your mail not verified from google',
      );
    }

    const existingUser = await User.isUserExist(decodedToken?.email as string);

    if (existingUser) {
      if (existingUser?.registerWith !== REGISTER_WITH.facebook) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `This account is registered with ${existingUser.registerWith}, so you should try logging in using that method.`,
        );
      }

      if (existingUser?.isDeleted) {
        throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
      }

      const jwtPayload: { userId: string; role: string } = {
        userId: existingUser?._id?.toString() as string,
        role: existingUser?.role,
      };

      const accessToken = createToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.jwt_access_expires_in as string,
      );

      const refreshToken = createToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.jwt_refresh_expires_in as string,
      );

      return {
        user: existingUser,
        accessToken,
        refreshToken,
      };
    }

    const user = await User.create({
      name: decodedToken?.name,
      email: decodedToken?.email,
      profile: decodedToken?.picture,
      phoneNumber: decodedToken?.phone_number,
      registerWith: REGISTER_WITH.facebook,
      role: payload?.role ?? USER_ROLE.user,
      verification: {
        status: true,
      },
    });

    if (!user) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create user',
      );
    }

    const jwtPayload: { userId: string; role: string } = {
      userId: user?._id?.toString() as string,
      role: user?.role,
    };

    const accessToken = createToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.jwt_access_expires_in as string,
    );

    const refreshToken = createToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.jwt_refresh_expires_in as string,
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Change password
const changePassword = async (id: string, payload: TChangePassword) => {
  const user = await User.IsUserExistId(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!(await User.isPasswordMatched(payload?.oldPassword, user.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Old password does not match');
  }
  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload?.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    },
    { new: true },
  );

  return result;
};

// Forgot password
const forgotPassword = async (email: string) => {
  const user = await User.isUserExist(email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user?.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const jwtPayload = {
    email: email,
    userId: user?._id,
  };

  const token = jwt.sign(jwtPayload, config.jwt_access_secret as Secret, {
    expiresIn: '3m',
  });

  const currentTime = new Date();
  const otp = generateOtp();
  const expiresAt = moment(currentTime).add(3, 'minute');

  await User.findByIdAndUpdate(user?._id, {
    needsPasswordChange: true,
    'verification.otp': otp,
    'verification.expiresAt': expiresAt,
  });

  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/forgot_pass_mail.html',
  );

  await sendEmail(
    user?.email,
    'Your reset password OTP is',
    fs
      .readFileSync(otpEmailPath, 'utf8')
      .replace('{{otp}}', otp)
      .replace('{{email}}', user?.email),
  );

  return { email, token };
};

// Reset password
const resetPassword = async (token: string, payload: TResetPassword) => {
  let decode;
  try {
    decode = jwt.verify(
      token,
      config.jwt_access_secret as string,
    ) as JwtPayload;
  } catch (err) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Session has expired. Please try again',
    );
  }

  const user: IUser | null = await User.findById(decode?.userId).select(
    'isDeleted verification',
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (new Date() > user?.verification?.expiresAt) {
    throw new AppError(httpStatus.FORBIDDEN, 'Session has expired');
  }

  if (!user?.verification?.status) {
    throw new AppError(httpStatus.FORBIDDEN, 'OTP is not verified yet');
  }

  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload?.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await User.findByIdAndUpdate(decode?.userId, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
    verification: {
      otp: 0,
      status: true,
    },
  });

  return result;
};

// Refresh token
const refreshToken = async (token: string) => {
  // Checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);
  const { userId } = decoded;
  const user = await User.IsUserExistId(userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  const jwtPayload: IJwtPayload = {
    userId: user?._id?.toString() as string,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  return {
    accessToken,
  };
};

export const authServices = {
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  registerWithGoogle,
  registerWithFacebook,
};
