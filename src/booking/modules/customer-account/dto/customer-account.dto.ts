import { IsEmail, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsString() @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsString() @MaxLength(30) phone!: string;
  @IsString() @MaxLength(1000) notes!: string;
}
export class CreateReviewDto {
  @IsString() appointmentId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @MaxLength(2000) text!: string;
}
