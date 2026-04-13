import { HttpException } from "@nestjs/common";

export class OfficeNotFoundException extends HttpException {
  name = 'OfficeNotFoundException';
}

export class UserNotFoundException extends HttpException {
  name = 'UserNotFoundException';
}