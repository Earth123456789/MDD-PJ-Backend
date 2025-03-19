import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';

export class MatchingRequestDto {
  @ApiProperty({
    description: 'Array of order IDs to match with vehicles',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  orderIds: string[];
}
