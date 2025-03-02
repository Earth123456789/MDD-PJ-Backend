# Set Up Your Database Connection

1. **Generate the Migration**  
   Run the following command to create and apply migrations:

   ```sh
   npx prisma migrate dev --name init_neon_migration
   ```

   This creates a new migration file and applies it to the NeonDB database.

2. **Update Prisma Client**  
   After migrating, update Prisma Client so your application recognizes the changes:

   ```sh
   npx prisma generate
   ```

3. **Verify Migration**  
   To check if everything is applied correctly, use Prisma Studio:

   ```sh
   npx prisma studio
   ```

   This opens a local UI where you can inspect and edit database records.

4. **Reset the Database (⚠️ Deletes All Data)**  
   If needed, reset your NeonDB and reapply migrations:

   ```sh
   npx prisma migrate reset
   ```

   ⚠️ Warning: This will delete all data and apply migrations from scratch.

5. **ADD Data**  
   If needed, reset your NeonDB and reapply migrations:

   ```sh
   npm run seed
   ```
