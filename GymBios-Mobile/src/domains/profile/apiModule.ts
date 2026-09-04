import { ProfileApi } from './infrastructure/api/ProfileApi';
import { GetMobileProfile } from './application/useCases/GetMobileProfile';
import { UpdateMobileProfile } from './application/useCases/UpdateMobileProfile';

export const profileApi = new ProfileApi();
export const getMobileProfile = new GetMobileProfile(profileApi);
export const updateMobileProfile = new UpdateMobileProfile(profileApi);
