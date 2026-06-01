export const MEDIA_ASPECT_RATIOS = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
};

export const getMediaAspectRatio = (aspectRatio = "16:9") => (
  MEDIA_ASPECT_RATIOS[aspectRatio] || MEDIA_ASPECT_RATIOS["16:9"]
);

export const getPreviewImageTransform = ({
  imagePosX = 0,
  imagePosY = 0,
  imageScaleX = 1,
  imageScaleY = 1,
  lockImageScale = true,
  imageRotation = 0,
}) => (
  `translate(calc(-50% + ${imagePosX * 50}%), calc(-50% + ${imagePosY * 50}%)) ` +
  `scale(${imageScaleX}, ${lockImageScale ? imageScaleX : imageScaleY}) ` +
  `rotate(${imageRotation}deg)`
);
