# Set Up Your Database Connection

1. **Set Up Your Database Connection**  
    If you haven't already, sign up for Neon and create a PostgreSQL database.  
    Copy the connection string from NeonDB (it looks like this):

    ```bash
    postgresql://username:password@hostname:port/dbname
    ```

    Then, add it to your `.env` file in your project:

    ```ini
    DATABASE_URL="postgresql://your_user:your_password@your_neon_host/your_database"
    ```

2. **Generate the Migration**  
    Run the following command to create and apply migrations:

    ```sh
    npx prisma migrate dev --name init_neon_migration
    ```

    This creates a new migration file and applies it to the NeonDB database.

3. **Push Changes Without Resetting Data**  
    If you don’t want to lose existing data, use:

    ```sh
    npx prisma db push
    ```

    This updates the database schema without running migrations.

4. **Update Prisma Client**  
    After migrating, update Prisma Client so your application recognizes the changes:

    ```sh
    npx prisma generate
    ```

5. **Verify Migration**  
    To check if everything is applied correctly, use Prisma Studio:

    ```sh
    npx prisma studio
    ```

    This opens a local UI where you can inspect and edit database records.

6. **Deploying Migrations in Production**  
    For production environments, deploy migrations with:

    ```sh
    npx prisma migrate deploy
    ```

    This ensures that all migrations are applied in your NeonDB production database.

7. **Reset the Database (⚠️ Deletes All Data)**  
    If needed, reset your NeonDB and reapply migrations:

    ```sh
    npx prisma migrate reset
    ```

    ⚠️ Warning: This will delete all data and apply migrations from scratch.


8. **ADD Data**  
    If needed, reset your NeonDB and reapply migrations:

    ```sh
    npm run seed
    ```
