import RGBUtils from "wayak-rgb-utils";

/**
 * @module PixelsSelector
 */


/**
 * Returns the values of a pixel of an image or canvas
 * @function getPixelInfo
 * @static
 * @param {number} x - x position.
 * @param {number} y - y position.
 * @param {(Image|Canvas)} canvasImageSource - source image.
 * @returns {object} a object with props r,g,b,a,uint32
 * @example
 * // returns {r:255,g:0,b:0,a:255,uint32:0xff0000ff}
 * PixelsSelector.getPixelInfo(4,4,canvas);
 */
const getPixelInfo = (x, y, canvasImageSource)=>{
    if(canvasImageSource instanceof Image){
        canvasImageSource  = getCanvasFromImage(canvasImageSource,x,y,1,1)
        x = 0
        y = 0
    }
    const ctx = canvasImageSource.getContext("2d")
    const imgData = ctx.getImageData(x,y,1,1)
    const pixel = (new Uint32Array(imgData.data.buffer))[0]
    return buildPixelData(pixel)
}


/**
 * Returns an image fill from a starting point as the "magic wand" tool in photoshop
 * @param {number} pX - x position.
 * @param {number} pY - y position.
 * @param {(Image|Canvas)} canvasImageSource - source image.
 * @param {number} tolerance - number (0-200).
 * @param {(string|number)} [tintColor] - can be '#ff0000'(string) or 0xff0000(number) or 'ff0000'(string), if is null return pixel with original rgb values.
 * @returns {ImageData} a ImageData Object with the same sizes of canvasImageSource
 * @example
 * // returns ImageData {data: Uint8ClampedArray(1000000),width:500,height:500}
 * PixelsSelector.floodFill(5,5,canvas,100);
 * @example
 * // returns ImageData {data: Uint8ClampedArray(1000000),width:500,height:500}
 * PixelsSelector.floodFill(67,68,canvas,100,0xff0000);
 * @example
 * // returns ImageData {data: Uint8ClampedArray(1000000),width:500,height:500}
 * PixelsSelector.floodFill(67,68,canvas,100,'#ff0000');
 */
const floodFill = (pX, pY, canvasImageSource, tolerance, tintColor)=>{
    if(canvasImageSource instanceof Image){
        canvasImageSource  = getCanvasFromImage(canvasImageSource)
    }
    const {width,height} = canvasImageSource
    const ctx = canvasImageSource.getContext("2d")
    const sourceImageData = ctx.getImageData(0,0,canvasImageSource.width,canvasImageSource.height)
    const  sourceArray32Buffer = new Uint32Array(sourceImageData.data.buffer)

    const pickedPixel = RGBUtils.numberToRGBA(sourceArray32Buffer[pY * canvasImageSource.width + pX])


    const resultImageData = new ImageData(width,height)
    const resultArray32Buffer = new Uint32Array(resultImageData.data.buffer)

    let rgbTintColorObj = null
    if(tintColor != null ){
        rgbTintColorObj = typeof(tintColor) === "string" ? RGBUtils.stringToRGBAObject(tintColor) : RGBUtils.numberToRGB(tintColor)
    }

    let total = 0
    function recursiveFunction(pointsToCheck) {
        function recursiveTrampoline (pointsToCheck) {
            let newPointsToCheck = []
            const totalPoints = pointsToCheck.length
            for(let i = 0; i <totalPoints; i++){
                const {x,y} = pointsToCheck[i]
                if(x < width && x > 0){
                    // check if current point exist and is not verified
                    const pixelIndex = y * width + x
                    const pixelData = resultArray32Buffer[pixelIndex]
                    if(pixelData != null && pixelData === 0){
                        // compare colors
                        let currentPixelData = RGBUtils.numberToRGBA(sourceArray32Buffer[pixelIndex])
                        let pixelAlphaResult = calculateAlphaBetweenColors(currentPixelData,pickedPixel,tolerance)
                        const r = rgbTintColorObj ? rgbTintColorObj.r : currentPixelData.r
                        const g = rgbTintColorObj ? rgbTintColorObj.g : currentPixelData.g
                        const b = rgbTintColorObj ? rgbTintColorObj.b : currentPixelData.b

                        resultArray32Buffer[pixelIndex] = RGBUtils.RGBAToNumber(r,g,b,pixelAlphaResult)

                        /*resultArray32Buffer[pixelIndex] =
                            (pixelAlphaResult   << 24) |    // alpha
                            (b << 16) |    // blue
                            (g <<  8) |    // green
                            r;             // red*/

                        if (pixelAlphaResult > 0){
                            newPointsToCheck.push({x:x,y:y-1})
                            newPointsToCheck.push({x:x+1,y:y})
                            newPointsToCheck.push({x:x,y:y+1})
                            newPointsToCheck.push({x:x-1,y:y})
                        }
                    }
                }


            }
            total += newPointsToCheck.length

            if(newPointsToCheck.length === 0){
                return 0
            }

            return recursiveTrampoline.bind(null,newPointsToCheck)
        }

        return trampoline(recursiveTrampoline.bind(null,pointsToCheck))
    }

    recursiveFunction([{x:pX,y:pY}])
    return resultImageData
}

/**
 * @ignore
 * Calculate the alpha value by mixing two colors based on a tolerance
 * @param {object} rgb1 - color object like {r:255,g:0,b:0}.
 * @param {number} rgb1.r - red value (0-255).
 * @param {number} rgb1.g - green value (0-255).
 * @param {number} rgb1.b - blue value (0-255).
 * @param {object} rgb2 - color object like {r:255,g:0,b:0}.
 * @param {number} rgb2.r - red value (0-255).
 * @param {number} rgb2.g - green value (0-255).
 * @param {number} rgb2.b - blue value (0-255).
 * @param {number} tolerance - number 0-200
 * @returns {number} alpha - number between 0-255
 */
const calculateAlphaBetweenColors = (rgb1, rgb2, tolerance)=>{
    const distance = RGBUtils.RGBDistance(rgb1,rgb2)
    if(distance >= tolerance){return 0}
    const alpha = 255 * ((tolerance - distance) / tolerance)
    return Math.round(alpha)
}



const getCanvasFromImage = (image,x,y,width,height)=>{
    x = x || 0
    y = y || 0
    width = width || image.width
    height = height || image.height
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    ctx.drawImage(image,x,y,width,height)
    return canvas
}

const buildPixelData = (pixelVal)=>{
    const {r,g,b,a} = RGBUtils.numberToRGBA(pixelVal)
    return {r,g,b,a,uint32:RGBUtils.RGBToNumber(r,g,b)}
}

const trampoline = function(f) {
    while (f && f instanceof Function) {
        f = f();
    }
    return f;
}




const PixelsSelector = {getPixelInfo,floodFill}


export default PixelsSelector