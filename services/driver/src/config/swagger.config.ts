import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Driver Service API",
      version: "1.0.0",
      description: "API documentation for Driver Service",
    },
    servers: [
      {
        url: "http://localhost:3002",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Driver: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Driver ID",
            },
            name: {
              type: "string",
              description: "Driver name",
            },
            phone: {
              type: "string",
              description: "Driver phone number",
            },
            licenseNumber: {
              type: "string",
              description: "Driver license number",
            },
            licenseType: {
              type: "string",
              description: "Type of driver license",
            },
            status: {
              type: "string",
              enum: ["AVAILABLE", "BUSY", "OFFLINE"],
              description: "Driver status",
            },
            currentLatitude: {
              type: "number",
              format: "float",
              nullable: true,
              description: "Driver current latitude",
            },
            currentLongitude: {
              type: "number",
              format: "float",
              nullable: true,
              description: "Driver current longitude",
            },
            locationLastUpdated: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Last time the location was updated",
            },
            preferredVehicleTypes: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Vehicle types preferred by the driver",
            },
            ratings: {
              type: "number",
              format: "float",
              description: "Driver ratings",
            },
            experience: {
              type: "integer",
              description: "Driver experience in years",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
          required: ["name", "phone", "licenseNumber", "licenseType"],
        },
        Vehicle: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Vehicle ID",
            },
            plateNumber: {
              type: "string",
              description: "Vehicle plate number",
            },
            type: {
              type: "string",
              description: "Vehicle type",
            },
            capacity: {
              type: "number",
              format: "float",
              description: "Maximum weight capacity in kg",
            },
            length: {
              type: "number",
              format: "float",
              description: "Vehicle length in meters",
            },
            width: {
              type: "number",
              format: "float",
              description: "Vehicle width in meters",
            },
            height: {
              type: "number",
              format: "float",
              description: "Vehicle height in meters",
            },
            status: {
              type: "string",
              enum: ["AVAILABLE", "IN_USE", "MAINTENANCE"],
              description: "Vehicle status",
            },
            fuelCapacity: {
              type: "number",
              format: "float",
              description: "Fuel tank capacity in liters",
            },
            currentFuel: {
              type: "number",
              format: "float",
              description: "Current fuel level in liters",
            },
            features: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Vehicle special features",
            },
            currentLatitude: {
              type: "number",
              format: "float",
              nullable: true,
              description: "Vehicle current latitude",
            },
            currentLongitude: {
              type: "number",
              format: "float",
              nullable: true,
              description: "Vehicle current longitude",
            },
            locationLastUpdated: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Last time the location was updated",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
          required: [
            "plateNumber",
            "type",
            "capacity",
            "length",
            "width",
            "height",
            "fuelCapacity",
            "currentFuel",
          ],
        },
        Assignment: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Assignment ID",
            },
            driverId: {
              type: "string",
              format: "uuid",
              description: "Driver ID",
            },
            vehicleId: {
              type: "string",
              format: "uuid",
              description: "Vehicle ID",
            },
            assignedAt: {
              type: "string",
              format: "date-time",
              description: "Assignment time",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
              description: "Assignment status",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
          required: ["driverId", "vehicleId"],
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  msg: {
                    type: "string",
                    description: "Error message",
                  },
                  param: {
                    type: "string",
                    description: "Parameter that caused the error",
                  },
                  location: {
                    type: "string",
                    description: "Location of the error (body, query, params)",
                  },
                },
              },
              description: "Validation errors",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"], // path to the API docs
};

export const specs = swaggerJsdoc(options);
