// order-matching-service/src/utils/helpers.ts

/**
 * คำนวณระยะทางระหว่างสองจุด (Haversine formula)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // รัศมีของโลกในหน่วยกิโลเมตร
    const dLat = degToRad(lat2 - lat1);
    const dLon = degToRad(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(degToRad(lat1)) *
        Math.cos(degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // ระยะทางในหน่วยกิโลเมตร
  
    return parseFloat(distance.toFixed(2));
  };
  
  /**
   * แปลงองศาเป็นเรเดียน
   */
  const degToRad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };
  
  /**
   * คำนวณเวลาที่ใช้ในการเดินทาง (นาที)
   * สมมติว่ารถเคลื่อนที่ด้วยความเร็วเฉลี่ย 30 กม./ชม. ในเมือง
   */
  export const calculateEstimatedTime = (distanceKm: number): number => {
    const averageSpeedKmPerHour = 30;
    const timeHours = distanceKm / averageSpeedKmPerHour;
    const timeMinutes = timeHours * 60;
    
    // เพิ่มเวลาเผื่อในการรับ-ส่งพัสดุ (5 นาที)
    const totalTime = timeMinutes + 5;
    
    return Math.round(totalTime);
  };
  
  /**
   * คำนวณราคาตามระยะทางและน้ำหนัก
   */
  export const calculatePrice = (distanceKm: number, weightKg: number): number => {
    // ค่าบริการเริ่มต้น
    let basePrice = 50;
    
    // ค่าบริการตามระยะทาง (10 บาท/กิโลเมตร)
    const distancePrice = distanceKm * 10;
    
    // ค่าบริการตามน้ำหนัก
    let weightPrice = 0;
    
    if (weightKg <= 1) {
      weightPrice = 0;
    } else if (weightKg <= 5) {
      weightPrice = 20;
    } else if (weightKg <= 10) {
      weightPrice = 50;
    } else if (weightKg <= 20) {
      weightPrice = 100;
    } else {
      weightPrice = 100 + (weightKg - 20) * 5; // 5 บาท/กก. สำหรับน้ำหนักที่เกิน 20 กก.
    }
    
    // คำนวณราคารวม
    const totalPrice = basePrice + distancePrice + weightPrice;
    
    // ปัดเศษให้เป็นจำนวนเต็ม
    return Math.ceil(totalPrice);
  };