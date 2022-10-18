module.exports = func => {
    return (req, res, next) => {
        func(req, res, next).catch(next);
    }
}

//we pass in func
//it returns a new function that has func executed
//which catches any errors and passes them to next