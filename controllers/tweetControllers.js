const { PrismaClient } = require('@prisma/client');
const { unlink } = require('fs');
const { join } = require('path');
const upload = require('../middlewares/upload');

const prisma = new PrismaClient();

const getTweetOptions = {
  orderBy: { createdAt: 'desc' },
  take: 10,
  include: {
    tweet_child: {
      select: { id: true, tweet: true },
    },
    tweet_photos: {
      select: { images: true },
    },
  },
};

const addTweet = async (req, res) => {
  upload(req, res, async (error) => {
    try {
      if (error) throw error;

      const { tweets = null } = req.body;
      const createOptions = { tweet: tweets };

      if (Array.isArray(tweets)) {
        createOptions.tweet = tweets.shift();
        createOptions.tweet_child = {
          createMany: {
            data: tweets.map((tweet) => ({
              tweet,
            })),
          },
        };
      }
      if (req.files) {
        createOptions.tweet_photos = {
          createMany: {
            data: req.files.map((file) => ({
              images: file.filename,
            })),
          },
        };
      }

      await prisma.tweet_parent.create({ data: createOptions });
      return res.status(201).json({
        message: 'tweet success created',
      });
    } catch (errors) {
      console.log(errors);
      return res.status(400).json({
        message: 'tweet failed to create',
      });
    }
  });
};

const getTweets = async (req, res) => {
  try {
    if (
      Object.prototype.hasOwnProperty.call(getTweetOptions, 'cursor') &&
      Object.prototype.hasOwnProperty.call(getTweetOptions, 'skip')
    ) {
      delete getTweetOptions.cursor;
      delete getTweetOptions.skip;
    }

    const tweets = await prisma.tweet_parent.findMany(getTweetOptions);
    if (!tweets.length) throw new Error('No tweet found');

    return res.json({ cursor: tweets[tweets.length - 1].id, tweets });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: `tweet failed to fetch, ${error.message}`,
    });
  }
};

const getInfiniteTweets = async (req, res) => {
  try {
    let cursor = parseInt(req.params.cursor, 10);

    getTweetOptions.cursor = { id: cursor };
    getTweetOptions.skip = 1;

    const tweets = await prisma.tweet_parent.findMany(getTweetOptions);

    cursor = tweets[tweets.length - 1].id;
    return res.status(200).json({ cursor, tweets });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: 'There is no more tweets to load',
    });
  }
};

const getSingleTweet = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const tweet = await prisma.tweet_parent.findUnique({
      where: { id },
      include: {
        tweet_child: {
          select: { id: true, tweet: true },
        },
        tweet_photos: {
          select: { images: true },
        },
      },
    });

    return res.status(200).json(tweet);
  } catch (error) {
    return res.status(404).json({
      message: 'Tweet not found',
    });
  }
};
/*
  BUGS: Deleting file when tweet is deleted is still not working,
  because the root directory is not from controller, but is from app.js, or idk :D
*/
const deleteTweet = async (req, res) => {
  try {
    const id = parseInt(req.params.idParent, 10);

    const foo = await prisma.tweet_parent.update({
      where: { id },
      include: { tweet_photos: true, tweet_child: true },
      data: {
        tweet_child: { deleteMany: { id_tweet_parent: id } },
        tweet_photos: { deleteMany: { id_tweet_parent: id } },
      },
    });
    console.log(foo);
    unlink(join(__dirname, '../public/uploads/images/52278811.jpg'), (err) => {
      if (err) throw err;
      console.log('file removed');
    });
    await prisma.tweet_parent.delete({
      where: { id },
    });
    return res.status(200).json({
      message: 'tweet successed to deleted',
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: 'tweet failed to delete',
    });
  }
};

const updateTweet = async (req, res) => {
  try {
    let { idParent: id, idChild = null } = req.params;
    const { tweet } = req.body;

    id = parseInt(id, 10);
    idChild = parseInt(idChild, 10);

    const updateOptions = {
      where: { id },
      data: { tweet },
    };

    if (idChild) {
      updateOptions.data = {
        tweet_child: {
          update: {
            where: { id: idChild },
            data: { tweet },
          },
        },
      };
    }

    await prisma.tweet_parent.update(updateOptions);
    return res.status(200).json({
      message: 'tweet successed to update',
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: 'tweet failed to update',
    });
  }
};

module.exports = {
  addTweet,
  getTweets,
  getInfiniteTweets,
  getSingleTweet,
  deleteTweet,
  updateTweet,
};
