import Contents from './contents.models';

export const DeleteBanner = async (id: string, keys: string[]) => {
  await Promise.all(
    keys.map(async key => {
      await Contents.findByIdAndUpdate(id, {
        $pull: { images: { key } },
      });
    }),
  );
};
