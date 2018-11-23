const imageScaleFactor = 0.2;
const outputStride = 16;
const flipHorizontal = false;
const stats = new Stats();
const contentWidth = 800;
const contentHeight = 600;

const condition = 1; // debbug on=1 / off=0





bindPage();

async function bindPage() {
    const net = await posenet.load(); // posenetの呼び出し
    let video;
    try {
        video = await loadVideo(); // video属性をロード
    } catch (e) {
        console.error(e);
        return;
    }
    detectPoseInRealTime(video, net);
}

// video属性のロード
async function loadVideo() {
    const video = await setupCamera(); // カメラのセットアップ
    video.play();
    return video;
}

// カメラのセットアップ
// video属性からストリームを取得する
async function setupCamera() {
    const video = document.getElementById('video');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': true
        });
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } else {
        const errorMessage = "This browser does not support video capture, or this device does not have a camera";
        alert(errorMessage);
        return Promise.reject(errorMessage);
    }
}




// ポーズの条件判定
function poseEstimation(keypoints) {
    let operation = "";
    if (keypoints[10].position.y < keypoints[0].position.y) {
        operation = "left";

    }

    (condition) ? console.log(operation) : "";

    return operation
};









// 取得したストリームをestimateSinglePose()に渡して姿勢予測を実行
// requestAnimationFrameによってフレームを再描画し続ける
function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const flipHorizontal = true; // since images are being fed from a webcam

    async function poseDetectionFrame() {
        stats.begin();
        let poses = [];
        const pose = await net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        ctx.clearRect(0, 0, contentWidth, contentHeight);

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-contentWidth, 0);
        ctx.drawImage(video, 0, 0, contentWidth, contentHeight);
        ctx.restore();

        poses.forEach(({ score, keypoints }) => {
            for (let i = 0; i < keypoints.length; i++) {
                drawWristPoint(keypoints[i], ctx, i);
            }
            poseEstimation(keypoints);
        });

        stats.end();

        requestAnimationFrame(poseDetectionFrame);
    }
    poseDetectionFrame();
}



// 与えられたKeypointをcanvasに描画する
function drawWristPoint(wrist, ctx, i) {
    ctx.beginPath();
    ctx.arc(wrist.position.x, wrist.position.y, 3, 0, 2 * Math.PI);

    if (wrist.score > 0.5) {  // 精度が一定以上なら描写する
        ctx.fillStyle = "red";
    } else if (condition) {
        ctx.fillStyle = "blue";
    };
    if (condition) {
        ctx.font = "17px cursive";
        let stringPosition = "(" + i + " , " + wrist.position.x.toFixed(0) + " , " + wrist.position.y.toFixed(0) + ")"
        ctx.fillText(stringPosition, wrist.position.x - 40, wrist.position.y + 20); //座標情報を表示
    }
    ctx.fill();
}
