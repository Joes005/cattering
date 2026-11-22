import { employerMarketplaceApi } from './employerMarketplaceApi';

export const membersApi = {
  list: (companyId) => employerMarketplaceApi.listAssignments(companyId),
  create: () => Promise.resolve({}),
  update: () => Promise.resolve({}),
  setPermissions: () => Promise.resolve({}),
};
