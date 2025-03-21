// order-matching-service/src/types/index.ts

export enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    MATCHING = "MATCHING",
    MATCHED = "MATCHED",
    DRIVER_ACCEPTED = "DRIVER_ACCEPTED",
    DRIVER_REJECTED = "DRIVER_REJECTED",
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
    PICKED_UP = "PICKED_UP",
    IN_TRANSIT = "IN_TRANSIT",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
  }
  
  export enum PaymentMethod {
    CASH = "CASH",
    CREDIT_CARD = "CREDIT_CARD",
    BANK_TRANSFER = "BANK_TRANSFER",
    WALLET = "WALLET"
  }
  
  export enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
  }
  
  export enum MatchingStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
  }