import UTILS from "../Utils";


const PixelsSelector = {}

/**
 * Returns the values of a pixel of an image or canvas
 * @param {number} x - x position.
 * @param {number} y - y position.
 * @param {(Image|Canvas)} canvasImageSource - source image.
 * @returns {object} a object with props r,g,b,a,uint32
 */
PixelsSelector.getPixelInfo = (x, y, canvasImageSource)=>{
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
 * @returns {object} a object with props r,g,b,a,uint32
 */
PixelsSelector.floodFill = (pX, pY, canvasImageSource, tolerance, tintColor)=>{
    const U = PixelsSelector.UTILS
    if(canvasImageSource instanceof Image){
        canvasImageSource  = getCanvasFromImage(canvasImageSource)
    }
    const {width,height} = canvasImageSource
    const ctx = canvasImageSource.getContext("2d")
    const sourceImageData = ctx.getImageData(0,0,canvasImageSource.width,canvasImageSource.height)
    const  sourceArray32Buffer = new Uint32Array(sourceImageData.data.buffer)

    const pickedPixel = U.numberToRGBA(sourceArray32Buffer[pY * canvasImageSource.width + pX])


    const resultImageData = new ImageData(width,height)
    const resultArray32Buffer = new Uint32Array(resultImageData.data.buffer)

    let rgbTintColorObj = null
    if(tintColor != null ){
        rgbTintColorObj = typeof(tintColor) === "string" ? U.stringToRGBAObject(tintColor) : U.numberToRGB(tintColor)
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
                        let currentPixelData = U.numberToRGBA(sourceArray32Buffer[pixelIndex])
                        let pixelAlphaResult = U.calculateAlphaBetweenColors(currentPixelData,pickedPixel,tolerance)
                        const r = rgbTintColorObj ? rgbTintColorObj.r : currentPixelData.r
                        const g = rgbTintColorObj ? rgbTintColorObj.g : currentPixelData.g
                        const b = rgbTintColorObj ? rgbTintColorObj.b : currentPixelData.b

                        resultArray32Buffer[pixelIndex] = U.RGBAToNumber(r,g,b,pixelAlphaResult)

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


PixelsSelector.UTILS = {}

/**
 * Transform integer number like 0xff0000 to rgb object like {r:255,g:0,b:0} inverse to RGBToNumber.
 * @param {integer} number - rgb color.
 * @returns {object} a object with r,g,b props
 */
PixelsSelector.UTILS.numberToRGB = function (number) {
    const r = number >> 16 & 0xFF
    const g = number >> 8 & 0xFF
    const b = number & 0xFF
    return {r,g,b}
}

/**
 * Transform rgb values to integer number like 0xff0000 inverse to numberToRGB.
 * @param {number} r - red value (0-255).
 * @param {number} g - green value (0-255).
 * @param {number} b - blue value (0-255).
 * @returns {uInt32} a color in uInt32 number like 0xff0000
 */
PixelsSelector.UTILS.RGBToNumber = function (r, g, b) {
    return ((r << 16) | (g << 8) | (b))
}


/**
 * Transform uInt32 number like 0xff0000ff to rgb object like {r:255,g:0,b:0,a:255} inverse to RGBAToNumber.
 * @param {uInt32} number - rgba color.
 * @returns {object} a object with r,g,b,a props
 */
PixelsSelector.UTILS.numberToRGBA =  (number)=> {
    const a = number >> 24 & 0xFF
    const b = number >> 16 & 0xFF
    const g = number >> 8 & 0xFF
    const r = number & 0xFF
    return {r,g,b,a}
}

/**
 * Transform rgba values to uInt32 number like 0xff0000ff inverse to RGBAToNumber.
 * @param {number} r - red value (0-255).
 * @param {number} g - green value (0-255).
 * @param {number} b - blue value (0-255).
 * @param {number} a - alpha value (0-255).
 * @returns {uInt32} a color in uInt32 number like 0xff0000ff
 */
PixelsSelector.UTILS.RGBAToNumber =  (r, g, b, a)=> {
    /* cast to 255 */
    r = r & 0xff
    g = g & 0xff
    b = b & 0xff
    a = a & 0xff

    return (a   << 24) |    // alpha
        (b << 16) |    // blue
        (g <<  8) |    // green
        r;             // red
}


/**
 * Transform a string value like '0xff0000ff' or '#ff0000'  in uInt32 number like 0xff0000ff.
 * @param {string} string - color string.
 * @returns {uInt32} a color in uInt32 number like 0xff0000ff
 */
PixelsSelector.UTILS.stringToRGBANumber =  (string)=> {
    const U = PixelsSelector.UTILS
    string = string.replace("#","").replace("0x","")
    const number = parseInt(string,16)
    if(string.length === 6){return number}
    const {r:a,g:b,b:g,a:r} = U.numberToRGBA(number)
    return U.RGBAToNumber(r,g,b,a)
}

/**
 * Transform a string value like '0xff0000ff' or '#ff0000' in a rgba object like {r:255,g:0,b:0,a:255}.
 * @param {string} string - color string.
 * @returns {object} a object with r,g,b,a props
 */
PixelsSelector.UTILS.stringToRGBAObject = (string)=>{
    const U = PixelsSelector.UTILS
    const number = U.stringToRGBANumber(string)
    string = string.replace("#","").replace("0x","")
    if(string.length === 6){return {...U.numberToRGB(number),a:255}}
    return U.numberToRGBA(number)
}
/**
 * return the distance between two rgb objects
 * @param {object} rgb1 - color object like {r:255,g:0,b:0}.
 * @param {number} rgb1.r - red value (0-255).
 * @param {number} rgb1.g - green value (0-255).
 * @param {number} rgb1.b - blue value (0-255).
 * @param {object} rgb2 - color object like {r:255,g:0,b:0}.
 * @param {number} rgb2.r - red value (0-255).
 * @param {number} rgb2.g - green value (0-255).
 * @param {number} rgb2.b - blue value (0-255).
 * @returns {number} distance
 */
PixelsSelector.UTILS.RGBDistance = (rgb1, rgb2)=>{
    /* like a 3d distance */
    const rDiff = rgb1.r - rgb2.r
    const gDiff = rgb1.g - rgb2.g
    const bDiff = rgb1.b - rgb2.b
    return Math.sqrt(rDiff*rDiff+gDiff*gDiff+bDiff*bDiff);
}

/**
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
PixelsSelector.UTILS.calculateAlphaBetweenColors = (rgb1, rgb2, tolerance)=>{
    const distance = PixelsSelector.UTILS.RGBDistance(rgb1,rgb2)
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
    const U = PixelsSelector.UTILS
    const {r,g,b,a} = U.numberToRGBA(pixelVal)
    return {r,g,b,a,uint32:U.RGBToNumber(r,g,b)}
}

const trampoline = function(f) {
    while (f && f instanceof Function) {
        f = f();
    }
    return f;
}







export default PixelsSelector