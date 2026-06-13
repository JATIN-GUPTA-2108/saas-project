export type OrganizationMember = {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  role: { slug: string; name: string };
  joinedAt: string;
};
