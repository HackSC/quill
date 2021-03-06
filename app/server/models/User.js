var mongoose = require('mongoose'),
    bcrypt = require('bcryptjs'),
    validator = require('validator'),
    jwt = require('jsonwebtoken');
JWT_SECRET = process.env.JWT_SECRET;

var profile = {

    firstName: {
        type: String,
        min: 1,
        max: 100,
    },

    lastName: {
        type: String,
        min: 1,
        max: 100,
    },

    gender: {
        type: String,
        enum: {
            values: [
                'Male',
                'Female',
                'Other',
                'Prefer not to answer'
            ]
        }
    },

    ethnicity: {
        type: String,
        enum: {
            values: [
                'White / Caucasian',
                'Black or African American',
                'Native American or Alaska Native',
                'Asian / Pacific Islander',
                'Hispanic / Latinx',
                'Multiracial / Other',
                'Prefer not to answer'
            ]
        }
    },

    school: {
        type: String,
        min: 1,
        max: 150,
    },

    year: {
        type: String,
        enum: {
            values: [
                '2019',
                '2020',
                '2021',
                '2022',
                'High School',
                'Graduate',
                'Other'
            ],
        }
    },

    major: {
        type: String,
        min: 1,
        max: 150,
    },

    experience: {
        type: String,
        enum: {
            values: [
                'Beginner',
                'Intermediate',
                'Advanced'
            ]
        }
    },

    resume: {
        name: String,
        id: String,
        link: String
    },

    essay1: {
        type: String,
        min: 1,
        max: 1500
    },

    essay2: {
        type: String,
        min: 1,
        max: 1500
    },

    essay3: {
        type: String,
        min: 1,
        max: 500
    },

    skills: String,

    linkedin: String,
    github: String,
    other: String,

    role: {
        developer: {
            type: Boolean,
            required: false,
            default: false
        },
        designer: {
            type: Boolean,
            required: false,
            default: false
        },
        productManager: {
            type: Boolean,
            required: false,
            default: false
        },
        other: {
            type: String,
            required: false
        }
    },

    transportation: {
        type: Boolean,
        required: true,
        default: false,
    },

    adult: {
        type: Boolean,
        required: true,
        default: false,
    },

    mlh: {
        type: Boolean,
        required: true,
        default: false,
    }

};

// Only after confirmed
var confirmation = {
    phoneNumber: String,
    dietaryRestrictions: [String],
    shirtSize: {
        type: String,
        enum: {
            values: 'XS S M L XL XXL'.split(' ')
        }
    },
    wantsHardware: Boolean,
    hardware: String,

    needsTransportation: Boolean,
    busStop: String,

    funFact: String,
    projectPlans: String,

    notes: String,

    signatureLiability: String,
    signaturePhotoRelease: String,
    signatureCodeOfConduct: String,
};

var status = {
    submitted: {
        type: Boolean,
        required: true,
        default: false,
    },
    admitted: {
        type: Boolean,
        required: true,
        default: false,
    },
    rejected: {
        type: Boolean,
        required: true,
        default: false
    },
    waitlisted: {
        type: Boolean,
        required: true,
        default: false
    },
    confirmed: {
        type: Boolean,
        required: true,
        default: false,
    },
    declined: {
        type: Boolean,
        required: true,
        default: false,
    },
    checkedIn: {
        type: Boolean,
        required: true,
        default: false,
    },
    checkInTime: {
        type: Number,
    },
    confirmBy: {
        type: Number
    }
};

var review = {
    reviewers: [{
        email: {
            type: String,
            validate: [
                validator.isEmail,
                'Invalid Email',
            ],
        },
        ratings: [Number],
        comments: String
    }],

    overallRating: {
        type: Number,
        default: 0,
    },

    // inconsistent naming but kill me later -Daniel
    reviewQueue: [String],

    reviewCount: {
        type: Number,
        default: 0
    },

    select: false,
};

var judging = {
    role: {
        type: String,
        enum: {
            values: [
                '',
                'General',
                'Sponsor',
            ],
        },
        default: '',
    },

    // For general judges
    group: {
        type: String,
        default: '',
    },

    // For sponsor judges
    categories: [String],

    queue: [{
        id: String,
        judged: {
            type: Boolean,
            default: false,
        }
    }],

    count: {
        type: Number,
        default: 0
    },

};

// define the schema for our admin model
var schema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
        unique: true,
        validate: [
            validator.isEmail,
            'Invalid Email',
        ]
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    admin: {
        type: Boolean,
        required: true,
        default: false,
    },

    judge: {
        type: Boolean,
        required: true,
        default: false,
    },

    /* Allow sponsors to register, get access to sponsor tab */
    sponsor: {
        type: Boolean,
        required: true,
        default: false
    },

    timestamp: {
        type: Number,
        required: true,
        default: Date.now(),
    },

    lastUpdated: {
        type: Number,
        default: Date.now(),
    },

    teamCode: {
        type: String,
        min: 0,
        max: 140,
    },

    verified: {
        type: Boolean,
        required: true,
        default: false
    },

    salt: {
        type: Number,
        required: true,
        default: Date.now(),
        select: false
    },

    /**
     * User Profile.
     *
     * This is the only part of the user that the user can edit.
     *
     * Profile validation will exist here.
     */
    profile: profile,

    /**
     * Confirmation information
     *
     * Extension of the user model, but can only be edited after acceptance.
     */
    confirmation: confirmation,

    status: status,

    /**
     * Only Admins are allowed to review
     */
    review: review,

    /**
     * Only Judges are allowed to judge
     */
    judging: judging,
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

//=========================================
// Instance Methods
//=========================================

// checking if this password matches
schema.methods.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

// Token stuff
schema.methods.generateEmailVerificationToken = function () {
    return jwt.sign(this.email, JWT_SECRET);
};

schema.methods.generateAuthToken = function () {
    return jwt.sign(this._id, JWT_SECRET);
};

/**
 * Generate a temporary authentication token (for changing passwords)
 * @return JWT
 * payload: {
 *   id: userId
 *   iat: issued at ms
 *   exp: expiration ms
 * }
 */
schema.methods.generateTempAuthToken = function () {
    return jwt.sign({
        id: this._id
    }, JWT_SECRET, {
        expiresInMinutes: 60,
    });
};

//=========================================
// Static Methods
//=========================================

schema.statics.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
};

/**
 * Verify an an email verification token.
 * @param  {[type]}   token token
 * @param  {Function} cb    args(err, email)
 */
schema.statics.verifyEmailVerificationToken = function (token, callback) {
    jwt.verify(token, JWT_SECRET, function (err, email) {
        return callback(err, email);
    });
};

/**
 * Verify a temporary authentication token.
 * @param  {[type]}   token    temporary auth token
 * @param  {Function} callback args(err, id)
 */
schema.statics.verifyTempAuthToken = function (token, callback) {
    jwt.verify(token, JWT_SECRET, function (err, payload) {

        if (err || !payload) {
            return callback(err);
        }

        if (!payload.exp || Date.now() >= payload.exp * 1000) {
            return callback({
                message: 'Token has expired.'
            });
        }

        return callback(null, payload.id);
    });
};

schema.statics.findOneByEmail = function (email) {
    return this.findOne({
        email: email.toLowerCase()
    });
};

/**
 * Get a single user using a signed token.
 * @param  {String}   token    User's authentication token.
 * @param  {Function} callback args(err, user)
 */
schema.statics.getByToken = function (token, callback) {
    jwt.verify(token, JWT_SECRET, function (err, id) {
        if (err) {
            return callback(err);
        }
        this.findOne({_id: id}, callback);
    }.bind(this));
};

schema.statics.validateProfile = function (profile, cb) {
    return cb(!(
        profile.firstName.length > 0 &&
        profile.lastName.length > 0 &&
        [
            'Male',
            'Female',
            'Other',
            'Prefer not to answer'
        ].indexOf(profile.gender) > -1 &&
        [
            'White / Caucasian',
            'Black or African American',
            'Native American or Alaska Native',
            'Asian / Pacific Islander',
            'Hispanic / Latinx',
            'Multiracial / Other',
            'Prefer not to answer'
        ].indexOf(profile.ethnicity) > -1 &&
        profile.school.length > 0 &&
        [
            '2019',
            '2020',
            '2021',
            '2022',
            'High School',
            'Graduate',
            'Other'
        ].indexOf(profile.year) > -1 &&
        profile.major.length > 0 &&
        profile.resume !== undefined &&
        profile.essay1.length > 0 && profile.essay1.length <= 1500 &&
        profile.essay2.length > 0 && profile.essay2.length <= 1500 &&
        profile.essay3.length > 0 && profile.essay3.length <= 500 &&
        profile.adult &&
        profile.mlh
    ));
};

//=========================================
// Virtuals
//=========================================

/**
 * Provide the firstName + lastName.
 */
schema.virtual('profile.name').get(function (){
    if(this.profile.firstName !== undefined && this.profile.lastName !== undefined){
        return this.profile.firstName + " " + this.profile.lastName;
    }
    return undefined;
});

/**
 * Has the user completed their profile?
 * This provides a verbose explanation of their furthest state.
 */
schema.virtual('status.name').get(function () {

    if (this.status.checkedIn) {
        return 'checked in';
    }

    if (this.status.declined) {
        return "declined";
    }

    if (this.status.confirmed) {
        return "confirmed";
    }

    if (this.status.admitted) {
        return "admitted";
    }

    if (this.status.rejected) {
        return "rejected";
    }

    if (this.status.waitlisted) {
        return "waitlisted";
    }

    if (this.status.submitted) {
        return "submitted";
    }

    if (!this.verified) {
        return "unverified";
    }

    return "incomplete";

});

module.exports = mongoose.model('User', schema);
