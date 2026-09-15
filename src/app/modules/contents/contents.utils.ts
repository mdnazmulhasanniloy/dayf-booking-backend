import Contents from './contents.models';

export const getValidPercentage = (
  value: unknown,
  fallback = 15,
): number => {
  const percentage = Number(value);

  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
    ? percentage
    : fallback;
};

export const DeleteBanner = async (id: string, keys: string[]) => {
  await Promise.all(
    keys.map(async key => {
      await Contents.findByIdAndUpdate(id, {
        $pull: { images: { key } },
      });
    }),
  );
};
