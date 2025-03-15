// src/types/prisma.d.ts

import { Prisma } from '@prisma/client'

declare module '@prisma/client' {
  namespace Prisma {
    // Extend DriverWhereUniqueInput to accept either number or string
    interface DriverWhereUniqueInput {
      id?: string | number
      user_id?: string | number
    }

    // Extend UserWhereUniqueInput to accept either number or string
    interface UserWhereUniqueInput {
      id?: string | number
      email?: string
    }

    // Extend VehicleWhereUniqueInput to accept either number or string 
    interface VehicleWhereUniqueInput {
      id?: string | number
    }
  }
}