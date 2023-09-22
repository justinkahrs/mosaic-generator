import React, { useEffect, useState } from "react";
import Masonry from "react-masonry-css";
import Dropzone from "react-dropzone";
import Grid from "@mui/material/Grid";

import "./ImageMosaic.css";
import { colors } from "./colors";

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};
const imageLinks = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg/1920px-Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg/1920px-Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg/1920px-Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg/1920px-Orange_tabby_cat_sitting_on_fallen_leaves-Hisashi-01A.jpg",
];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

function ImageMosaic() {
  const [images, setImages] = useState([]);
  const [mosaic, setMosaic] = useState([]);
  const [minBlockSize, setMinBlockSize] = useState(300);
  const [maxBlockSize, setMaxBlockSize] = useState(500);
  const [minImageSize, setMinImageSize] = useState(300);
  const [maxImageSize, setMaxImageSize] = useState(500);

  useEffect(() => {
    generateMosaic();
  }, [images]);

  const blocks = Array.from({ length: colors.length }, () => {
    const backgroundColor = getRandomColor();
    return { backgroundColor };
  });

  const generateMosaic = () => {
    const pics = images.length > 0 ? images : imageLinks;
    const imagesPlusBlocksInjected = pics.reduce((acc, image, index) => {
      const block = blocks[index];
      return [...acc, image, block];
    }, []);
    const shuffledImagesPlusBlocksInjected = imagesPlusBlocksInjected.sort(
      () => Math.random() - 0.5
    );
    setMosaic(shuffledImagesPlusBlocksInjected);
  };

  const randomDimension = (minDimension, maxDimension) => {
    const random = Math.random();
    const dimension = Math.ceil(
      random * (maxDimension - minDimension) + minDimension
    );

    return { width: dimension, height: dimension };
  };

  const handleDrop = (acceptedFiles) => {
    setImages(acceptedFiles.map((file) => URL.createObjectURL(file)));
  };

  console.log("mosaic", mosaic);

  return (
    <Grid container>
      <Grid
        container
        spacing={2}
        style={{
          height: "200px",
          border: "2px dashed black",
          borderRadius: "5px",
          margin: "20px",
        }}
        alignItems={"center"}
        justifyContent={"center"}
      >
        <Dropzone onDrop={handleDrop}>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className="dropzone"
              style={{
                height: "100%",
                width: "100%",
                textAlign: "center",
              }}
            >
              <input {...getInputProps()} />
              <p
                style={{
                  height: "100%",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                }}
              >
                Drag and drop some images here, or click to select images
              </p>
            </div>
          )}
        </Dropzone>
      </Grid>
      <Grid
        container
        spacing={2}
        justifyContent={"space-around"}
        style={{ marginBottom: "20px" }}
      >
        <Grid item xs={4}>
          <Grid container textAlign={"center"}>
            <Grid item xs={6}>
              <label htmlFor="block-size-slider">Min Block Size:</label>
              <input
                type="range"
                id="block-size-slider"
                name="block-size-slider"
                min="100"
                max="200"
                value={minBlockSize}
                onChange={(event) => setMinBlockSize(event.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <label htmlFor="block-size-slider">Max Block Size:</label>
              <input
                type="range"
                id="block-size-slider"
                name="block-size-slider"
                min="100"
                max="200"
                value={maxBlockSize}
                onChange={(event) => setMaxBlockSize(event.target.value)}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={4}>
          <Grid
            alignContent={"center"}
            alignItems={"center"}
            container
            spacing={4}
            justifyContent={"space-around"}
          >
            <Grid item>
              <button onClick={generateMosaic}>Generate Mosaic</button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={4}>
          <Grid container textAlign={"center"}>
            <Grid item xs={6}>
              <label htmlFor="block-size-slider">Min Image Size:</label>
              <input
                type="range"
                id="block-size-slider"
                name="block-size-slider"
                min="300"
                max="600"
                value={minImageSize}
                onChange={(event) => setMinImageSize(event.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <label htmlFor="block-size-slider">Max Image Size:</label>
              <input
                type="range"
                id="block-size-slider"
                name="block-size-slider"
                min="300"
                max="600"
                value={maxImageSize}
                onChange={(event) => setMaxImageSize(event.target.value)}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid
        container
        spacing={2}
        style={{
          height: window.innerHeight,
          width: window.innerWidth,
          overflow: "hidden",
        }}
      >
        <Grid item xs={12}>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {mosaic.map((image, index) => {
              const isImage = typeof image === "string";
              const { height, width } = isImage
                ? randomDimension(minImageSize, maxImageSize)
                : randomDimension(minBlockSize, maxBlockSize);
              console.log("image", image);

              return (
                <>
                  {typeof image === "string" ? (
                    <div
                      style={{
                        height: height,
                        width: width,
                        backgroundColor: "white",
                      }}
                    >
                      <img
                        src={image}
                        alt={`uploaded-${index}`}
                        style={{
                          objectFit: "cover",
                          maxWidth: width,
                          maxHeight: height,
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        height: height,
                        width: width,
                        backgroundColor: getRandomColor(),
                      }}
                    />
                  )}
                </>
              );
            })}
          </Masonry>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default ImageMosaic;
