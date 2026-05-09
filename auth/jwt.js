import { SignJWT, jwtVerify } from 'jose';

export function createJwt(rawSecret) {
  const secret = new TextEncoder().encode(rawSecret);

  return {
    signToken(payload) {
      return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret);
    },
    async verifyToken(token) {
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, secret);
        return payload;
      } catch {
        return null;
      }
    },
  };
}
