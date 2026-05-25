import { Module } from "@nestjs/common";
import { BookingService } from "./services";
import { BookingController } from "./controllers";

@Module({
    imports: [],
      providers: [BookingService],
      controllers: [BookingController],
      exports: [],
})
export class BookingModule {}