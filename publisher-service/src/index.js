var Rabbit = require('./rabbit');
const axios = require('axios');
const rabbit = new Rabbit();
const Reg = new RegExp(/<script type="text\/javascript">window\._sharedData = (.*);<\/script>/)

const fetchInstagramPhotos = async (accountUrl) => {
    const response = await axios.get(accountUrl)
    const json = JSON.parse(response.data.match(Reg)[1])
    const edges = json.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges.splice(0, 8)
    const photos = edges.map(({ node }) => {
        return {
            url: `https://www.instagram.com/p/${node.shortcode}/`,
            thumbnailUrl: node.thumbnail_src,
            displayUrl: node.display_url,
            caption: node.edge_media_to_caption.edges[0].node.text
        }
    })
    return photos
}

async function sendImgs() {
    try {
        const photos = await fetchInstagramPhotos('https://www.instagram.com/intertelecom.net.br/')
        photos.forEach(el => {
        const img = {
            link: el.thumbnailUrl,
            timestamp: new Date().getTime().toString()
        }
        const imgString = JSON.stringify(img);
        console.log('Sending message: [%s]', imgString);
        rabbit.sendImage(imgString);
        })
    } catch (e) {
        console.error('Fetching Instagram photos failed', e)
    }
}

function connect(connectionString) {
    console.log('Connecting to [%s]', connectionString);
    rabbit.connect(connectionString).then(() => {
        console.log('Connected');
        sendImgs();
    }).catch(err => {
        console.log(err);
        setTimeout(connect, 3000, connectionString);
    });
}

let connectionString = '';
const cmdArg = process.env['RABBIT_HOST'];
if (null != cmdArg) {
    connectionString = cmdArg;
} else {
    connectionString = 'amqp://localhost';
}

connect(connectionString);

function exitHandler(options, err) {
    if (options.cleanup) rabbit.disconnect();
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}


process.on('exit', exitHandler.bind(null, {
    cleanup: true
}));
process.on('SIGINT', exitHandler.bind(null, {
    exit: true
}));
process.on('SIGUSR1', exitHandler.bind(null, {
    exit: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
    exit: true
}));
process.on('uncaughtException', exitHandler.bind(null, {
    exit: true
}));
