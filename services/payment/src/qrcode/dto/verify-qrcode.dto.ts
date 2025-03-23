import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyQrCodeDto {
  @ApiProperty({
    description: 'The data from the PromptPay QR code scan',
    example: '00020101021229370016A000000677010111011300668912345675802TH530376463041234.505802TH6304REF123',
  })
  @IsString()
  @IsNotEmpty()
  scanData: string;
}