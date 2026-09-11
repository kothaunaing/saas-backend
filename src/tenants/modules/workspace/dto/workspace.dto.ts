import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppointmentStatus } from '../../../../generated/prisma/client';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class BreakDto {
  @Matches(timePattern) start!: string;
  @Matches(timePattern) end!: string;
}
export class WorkDayDto {
  @IsOptional() @IsInt() @Min(0) dayOfWeek?: number;
  @IsOptional() @IsString() day?: string;
  @IsBoolean() enabled!: boolean;
  @Matches(timePattern) start!: string;
  @Matches(timePattern) end!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakDto)
  breaks!: BreakDto[];
}
export class CustomerDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() @Min(0) points?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() visits?: number;
  @IsOptional() @IsNumber() noShow?: number;
  @IsOptional() @IsNumber() spent?: number;
  @IsOptional() @IsString() last?: string;
}
export class ServiceDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsInt() @Min(1) duration!: number;
  @IsNumber() @Min(0) price!: number;
  @IsBoolean() active!: boolean;
  @IsOptional() @IsString() description?: string;
}
export class StaffDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() role!: string;
  @IsBoolean() active!: boolean;
  @IsArray() @IsString({ each: true }) services!: string[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkDayDto)
  hours!: WorkDayDto[];
}
export class AppointmentDto {
  @IsOptional() @IsString() id?: string;
  @IsString() customerId!: string;
  @IsString() serviceId!: string;
  @IsString() staffId!: string;
  @IsDateString() date!: string;
  @Matches(timePattern) time!: string;
  @Transform(
    ({ value }: { value: string }) =>
      ({
        Pending: 'PENDING',
        Confirmed: 'CONFIRMED',
        'In progress': 'IN_PROGRESS',
        Completed: 'COMPLETED',
        Cancelled: 'CANCELLED',
        'No-show': 'NO_SHOW',
      })[value] ?? value,
  )
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
  @IsOptional() @IsString() notes?: string;
}
export class RewardDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name!: string;
  @IsInt() @Min(0) points!: number;
  @IsOptional() @IsString() description?: string;
  @IsBoolean() active!: boolean;
}
export class SettingsDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsString() currency!: string;
  @IsString() timezone!: string;
  @IsBoolean() confirmation!: boolean;
  @IsBoolean() reminders!: boolean;
  @IsBoolean() loyalty!: boolean;
  @IsInt() @Min(0) pointsPerDollar!: number;
  @IsOptional() @IsString() plan?: string;
}
export class UpdateWorkspaceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerDto)
  customers!: CustomerDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services!: ServiceDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffDto)
  staff!: StaffDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentDto)
  appointments!: AppointmentDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RewardDto)
  rewards!: RewardDto[];
  @ValidateNested() @Type(() => SettingsDto) settings!: SettingsDto;
}
