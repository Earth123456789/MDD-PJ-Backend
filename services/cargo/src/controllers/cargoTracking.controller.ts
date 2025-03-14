import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ดึงข้อมูลการติดตามของ Cargo
export const getCargoTracking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const trackingData = await prisma.cargoTracking.findMany({
            where: { cargo_id: BigInt(id) },
        });

        if (!trackingData || trackingData.length === 0) {
            return res.status(404).json({ error: 'Tracking data not found' });
        }

        res.json(trackingData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
};

// เพิ่มข้อมูลการติดตามของ Cargo
export const addCargoTracking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { location_name, latitude, longitude, status_update } = req.body;

        const newTracking = await prisma.cargoTracking.create({
            data: {
                cargo_id: BigInt(id),
                location_name,
                latitude,
                longitude,
                status_update,
            },
        });

        res.status(201).json(newTracking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add tracking data' });
    }
};

// อัปเดตข้อมูลการติดตามของ Cargo
export const updateCargoTracking = async (req: Request, res: Response) => {
    try {
        const { id, trackingId } = req.params;
        const { location_name, latitude, longitude, status_update } = req.body;

        const updatedTracking = await prisma.cargoTracking.update({
            where: { tracking_id: BigInt(trackingId) },
            data: {
                cargo_id: BigInt(id),
                location_name,
                latitude,
                longitude,
                status_update,
            },
        });

        res.json(updatedTracking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update tracking data' });
    }
};
