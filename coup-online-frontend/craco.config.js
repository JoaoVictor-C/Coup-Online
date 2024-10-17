const path = require('path');

module.exports = {
    webpack: {
        alias: {
            '@components': path.resolve(__dirname, 'src/components/'),
            '@pages': path.resolve(__dirname, 'src/pages/'),
            '@services': path.resolve(__dirname, 'src/services/'),
            '@hooks': path.resolve(__dirname, 'src/hooks/'),
            '@context': path.resolve(__dirname, 'src/context/'),
            '@utils': path.resolve(__dirname, 'src/utils/'),
            '@assets': path.resolve(__dirname, 'src/assets/'),
        },
    },
};