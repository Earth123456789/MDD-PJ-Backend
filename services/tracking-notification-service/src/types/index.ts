// tracking-notification-service/src/types/index.ts

export enum TrackingStatus {
    ORDER_CREATED = "ORDER_CREATED",
    DRIVER_MATCHED = "DRIVER_MATCHED",
    DRIVER_ACCEPTED = "DRIVER_ACCEPTED",
    DRIVER_ARRIVED_AT_PICKUP = "DRIVER_ARRIVED_AT_PICKUP",
    PACKAGE_PICKED_UP = "PACKAGE_PICKED_UP",
    IN_TRANSIT = "IN_TRANSIT",
    ARRIVED_AT_DROPOFF = "ARRIVED_AT_DROPOFF",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED"
  }
  
  export enum NotificationType {
    ORDER_UPDATE = "ORDER_UPDATE",
    DRIVER_UPDATE = "DRIVER_UPDATE",
    SYSTEM = "SYSTEM",
    PAYMENT = "PAYMENT"
  }
  
  export enum DeviceType {
    IOS = "IOS",
    ANDROID = "ANDROID",
    WEB = "WEB"
  }