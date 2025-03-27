// notification-service/src/types/index.ts

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