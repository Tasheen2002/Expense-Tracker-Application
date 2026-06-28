import { Metadata } from 'next';

export const buildMetadata = (title: string, description: string): Metadata => {
  return {
    title: `${title} | Expense Tracker`,
    description,
    robots: {
      index: true,
      follow: true,
    },
  };
};
