import jwt, { JwtPayload } from 'jsonwebtoken';
import axios from 'axios'; 
export const createToken = (
  jwtPayload: { userId: string; role: string },
  secret: string,
  expiresIn: string,
) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn,
  });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as JwtPayload;
};

export async function verifyGoogleToken(accessToken: string) {
  // try {
  //   const url = `https://www.googleapis.com/oauth2/v3/userinfo?id_token=${accessToken}`;
  //   const response = await axios.get(url);
  //   return { success: true, data: response.data };
  // } catch (error: any) {
  //   console.error('Google token verification failed:', error);
  //   return {
  //     success: false,
  //     message: `Google token verification failed: ${error?.message}`,
  //   };
  // }
// const GOOGLE_CLIENT_ID =
//   '698574081262-iqsu22or3h94bp8rl0f4qg33r7ls1p0b.apps.googleusercontent.com';
//   try {
//      const client = new OAuth2Client(GOOGLE_CLIENT_ID);

//      const ticket = await client.verifyIdToken({
//        idToken: accessToken,
//        audience: GOOGLE_CLIENT_ID,
//      });

//      return ticket.getPayload(); 
// } catch (error: any) {
//     console.error('Google token verification failed:', error);
//     return {
//       success: false,
//       message: `Google token verification failed: ${error?.message}`,
//     };
//   }
}

export async function verifyFacebookToken(accessToken: string) {
  try {
    const url = `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture`;
    const response = await axios.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Facebook token verification failed:', error);
    return {
      success: false,
      message: `Facebook token verification failed: ${error}`,
    };
  }
}
