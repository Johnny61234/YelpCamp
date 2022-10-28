const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
// const Joi = require('joi'); //javascript validator tool
const {campgroundSchema} = require('./schemas.js');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const Campground = require('./models/campground');
const Review = require('./models/review');

mongoose.connect('mongodb://localhost:27017/yelp-camp');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Database connected');
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({extended: true}))
app.use(methodOverride('_method'));

const validateCampground = (req, res, next) => {
    const {error} = campgroundSchema.validate(req.body); //campgroundSchema is defined in our schemas.js file and required at the top 'const {campgroundSchema}'
    if(error){
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

app.get('/', (req, res) => {
    res.render('home');
})

app.get('/campgrounds', catchAsync(async (req, res, next) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', {campgrounds})
}))

app.get('/campgrounds/new', (req, res) => {
    res.render('campgrounds/new');
})

//we need to be sure that this line above goes before the below code or else it's going to place /new as the /:id area, which will prevent our /new from running since it'll see /new as an id
app.post('/campgrounds', validateCampground, catchAsync(async (req, res, next) => {
    // if(!req.body.campground) throw new ExpressError('invalid camground data', 400);

    //the following is server side validation
    //we have the required fields in our html markup
    //but this allows us to validate if someone were to use postman for instance
    //Joi is an NPM package for data validation
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`)
}))

app.get('/campgrounds/:id', catchAsync(async (req, res, next) => {
    const campground = await Campground.findById(req.params.id)
    //req.params is an object containing properties mapped to the name route "parameters"
    // campgrounds/:id, the ":id" is available as req.params.id and defaults to {}
    res.render('campgrounds/show', { campground })
}))

app.get('/campgrounds/:id/edit', catchAsync(async (req, res, next) => {
    const campground = await Campground.findById(req.params.id);
    res.render('campgrounds/edit', { campground })
}))

app.put('/campgrounds/:id', validateCampground, catchAsync(async(req, res, next) => {
    const {id} = req.params;
    const campground = await Campground.findByIdAndUpdate(id,{...req.body.campground});
    res.redirect(`/campgrounds/${campground._id}`)
}))

app.delete('/campgrounds/:id', catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect('/campgrounds');
}));

app.post('/campgrounds/:id/reviews', catchAsync(async(req, res) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
}))

app.all('*', (req, res, next) => { //now if we go to a page that doesn't exist, the lines of code within this function will run
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => { //this is our catch all for any error, we can add if statements to figure out specifics for each error
    const {statusCode = 500, message = 'Something went wrong'} = err;
    if(!err.message) err.message = 'Oh no, something went wrong!'
    res.status(statusCode).render('error', ('errpr', { err }));
})

app.listen(3000, ()=> {
    console.log('Serving on port 3000')
});

