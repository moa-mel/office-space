import { SetMetadata } from "@nestjs/common";

export const NO_ACCOUNT_GUARD = 'noAccountGuard';
export const noAccountGuard = () => SetMetadata(NO_ACCOUNT_GUARD, true);