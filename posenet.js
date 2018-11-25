const imageScaleFactor = 0.2;
const outputStride = 16;
const flipHorizontal = false;
const stats = new Stats();
const contentWidth = 800;
const contentHeight = 600;

const condition = 1; // debbug on=1 / off=0
const seido = 0.5; //判定のしきい値
//
var sendPose_bef = 0 // 前回の命令
var sendPose_now = 0 // 今回の命令

const requestUrl_message = ["該当なし", "↑", "→", "←", "↓", "ストップ"]
const requestUrl = [
    '',
    'http://mygopigo.com/execute/fast?to_run_code=gpg.set_speed(40)%0Agpg.forward()',
    'http://mygopigo.com/execute/fast?to_run_code=gpg.set_speed(40)%0Agpg.right()',
    'http://mygopigo.com/execute/fast?to_run_code=gpg.set_speed(40)%0Agpg.left()',
    'http://mygopigo.com/execute/fast?to_run_code=gpg.set_speed(40)%0Agpg.backward()',
    'http://mygopigo.com/execute/fast?to_run_code=gpg.stop()']


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


function send_url() {

}


// ポーズの条件判定
function poseEstimation(estimation_list) {
    let operation = "";

    //scoreチェック。使用するポイントのスコアが一つでも低い場合、判定しない
    for (let j of [0, 5, 6, 9, 10]) {  //数字は使うポジションの値
        if (estimation_list[j].score < seido) {
            (condition) ? console.log("値が不確定でbreak", j, estimation_list[j].score) : "";
            return operation; //関数を抜ける
        };
    };


    let pos_0 = estimation_list[0].position //鼻
    // let pos_1 = estimation_list[1] //
    let pos_5 = estimation_list[5].position //右肩
    let pos_6 = estimation_list[6].position //左肩
    // let pos_7 = estimation_list[7] //右肘
    // let pos_8 = estimation_list[8] //左肘
    let pos_9 = estimation_list[9].position // 右手首
    let pos_10 = estimation_list[10].position //左手首


    if ((pos_9.y < pos_5.y) && (pos_10.y < pos_6.y)) {
        sendPose_now = 1 //↑

    } else if ((pos_9.y < pos_5.y) && (pos_10.x > pos_6.y)) {
        sendPose_now = 2 //→

    } else if ((pos_9.y > pos_5.y) && (pos_10.y < pos_6.y)) {
        sendPose_now = 3 // ←

    } else if (pos_0.y < 0) {
        sendPose_now = 4 // ↓

    } else if ((pos_9.y > pos_5.y) && (pos_10.y > pos_6.y)) {
        sendPose_now = 5 // stop

    } else {
        sendPose_now = 99 // ポジション取れているけど該当しない
    }

    // send_url()


    (condition) ? console.log(requestUrl_message[sendPose_now]) : "";

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

    if (wrist.score > seido) {  // 精度が一定以上なら描写する
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
