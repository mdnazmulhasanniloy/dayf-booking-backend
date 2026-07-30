import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import { generateOtp } from '../../utils/otpGenerator';
import moment from 'moment';
import { sendEmail } from '../../utils/mailSender';
import config from '../../config';
import { User } from '../user/user.models';
import { IUser } from '../user/user.interface';
import fs from 'fs';
import path from 'path';
import { sendSms } from '../../utils/smsSender';

const verifyOtp = async (token: string, otp: string | number) => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  let decode;
  try {
    decode = jwt.verify(
      token,
      config.jwt_access_secret as Secret,
    ) as JwtPayload;
  } catch (err) {
    console.error(err);
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Session has expired. Please try to submit OTP within 3 minute',
    );
  }

  const user: IUser | null = await User.findById(decode?.userId).select(
    'verification status ',
  );
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }
  if (new Date() > user?.verification?.expiresAt) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'OTP has expired. Please resend it',
    );
  }
  if (Number(otp) !== Number(user?.verification?.otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP did not match');
  }

  const updateUser = await User.findByIdAndUpdate(
    user?._id,
    {
      $set: {
        verification: {
          otp: 0,
          expiresAt: moment().add(3, 'minute'),
          status: true,
        },
      },
    },
    { new: true },
  ).select('email _id username role');

  const jwtPayload = {
    email: updateUser?.email,
    role: updateUser?.role,
    userId: updateUser?._id,
  };
  const jwtToken = jwt.sign(jwtPayload, config.jwt_access_secret as Secret, {
    expiresIn: '30d',
  });

  return { user: updateUser, token: jwtToken };
};

const resendOtp = async (email: string) => {
  console.log(email);
  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
    }

    const otp = generateOtp();
    const expiresAt = moment().add(3, 'minute');

    const updateOtp = await User.findByIdAndUpdate(
      user?._id,
      {
        $set: {
          verification: {
            otp,
            expiresAt,
            status: false,
          },
        },
      },
      { new: true },
    );

    if (!updateOtp) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to resend OTP. Please try again later',
      );
    }

    const jwtPayload = {
      email: user?.email,
      userId: user?._id,
    };
    const token = jwt.sign(jwtPayload, config.jwt_access_secret as Secret, {
      expiresIn: '3m',
    });

    const otpEmailPath = path.join(
      __dirname,
      '../../../../public/view/otp_mail.html',
    );

    await sendEmail(
      user?.email,
      'Your One Time OTP',
      fs.readFileSync(otpEmailPath, 'utf8').replace('{{otp}}', otp),
    );

    return { token };
  } catch (error: any) {
    console.log(error);
    throw new AppError(httpStatus.BAD_GATEWAY, error?.message);
  }
};

const sendPhoneOtp = async (email: string) => {
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
    }
    if (!user.phoneNumber) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Phone number is not available',
      );
    }

    const otp = generateOtp();
    const expiresAt = moment().add(3, 'minute');
    await User.findByIdAndUpdate(user._id, {
      $set: {
        phoneVerification: {
          otp,
          expiresAt,
          status: false,
        },
      },
    });

    const token = jwt.sign(
      { email: user.email, userId: user._id, purpose: 'phone-verification' },
      config.jwt_access_secret as Secret,
      { expiresIn: '3m' },
    );

    await sendSms(
      user.phoneNumber,
      `Your DAYF phone verification code is ${otp}. It expires in 3 minutes.`,
    );
    return { token };
  } catch (error: any) {
    throw new AppError(httpStatus?.BAD_REQUEST, error?.message);
    console.log(error);
  }
};

const verifyPhoneOtp = async (token: string, otp: string | number) => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      token,
      config.jwt_access_secret as Secret,
    ) as JwtPayload;
  } catch {
    throw new AppError(httpStatus.FORBIDDEN, 'Phone OTP session has expired');
  }

  if (decoded.purpose !== 'phone-verification') {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid phone OTP token');
  }

  const user = await User.findById(decoded.userId).select('phoneVerification');
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }
  if (
    !user.phoneVerification?.expiresAt ||
    new Date() > user.phoneVerification.expiresAt
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Phone OTP has expired');
  }
  if (Number(otp) !== Number(user.phoneVerification.otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Phone OTP did not match');
  }

  await User.findByIdAndUpdate(user._id, {
    $set: {
      phoneVerification: {
        otp: 0,
        expiresAt: new Date(),
        status: true,
      },
    },
  });
  return { verified: true };
};

export const otpServices = {
  verifyOtp,
  resendOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
};
