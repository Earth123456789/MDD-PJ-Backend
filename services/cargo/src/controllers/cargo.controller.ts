import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// เพิ่ม Cargo ใหม่
export const createCargo = async (req: Request, res: Response) => {
    try {
        const { order_id, description, weight_kg, volume_cubic_meters, hazard_class, insurance_value, status } = req.body;

        // สร้าง Cargo ใหม่
        const newCargo = await prisma.cargo.create({
            data: {
                order_id,
                description,
                weight_kg,
                volume_cubic_meters,
                hazard_class,
                insurance_value,
                status,
            },
        });

        // ส่งข้อมูล Cargo ใหม่กลับไป
        res.status(201).json(newCargo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create cargo' });
    }
};


// อัปเดต Cargo โดยใช้ cargo_id
export const updateCargo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { description, weight_kg, volume_cubic_meters, hazard_class, insurance_value, status } = req.body;

        // อัปเดตข้อมูล Cargo
        const updatedCargo = await prisma.cargo.update({
            where: { cargo_id: BigInt(id) },
            data: {
                description,
                weight_kg,
                volume_cubic_meters,
                hazard_class,
                insurance_value,
                status,
            },
        });

        res.json(updatedCargo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update cargo' });
    }
};


// ลบ Cargo ตาม cargo_id
export const deleteCargo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // ลบ Cargo
        await prisma.cargo.delete({
            where: { cargo_id: BigInt(id) },
        });

        res.json({ message: 'Cargo deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete cargo' });
    }
};
