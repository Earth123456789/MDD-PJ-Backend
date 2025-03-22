import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_REDIRECT_URI!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        const existingUser = await prisma.authUser.findUnique({ where: { email } });

        if (existingUser) return done(null, existingUser);

        const newUser = await prisma.authUser.create({
          data: {
            email: email!,
            provider: "GOOGLE",
            password: "", // อาจเว้นไว้ถ้าใช้เฉพาะ social login
          },
        });

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);
