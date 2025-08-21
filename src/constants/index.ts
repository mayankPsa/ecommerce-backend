export const MONGO_DEFAULT_PATH = "mongodb://127.0.0.1:27017";
export const DEFAULT_DB = "defaultDB";
export const DEFAULT_PORT = 9000;
export const AUTHORIZATION = "authorization";
export const OTP_VERIFICATION = "OTP Verification";
export const DEFAULT_ERROR_LOG = "Error message:";
export const NAME_REQUIRED = "Full Name can not be empty.";
export const FCM_TOKEN_REQUIRED = "FCM token reuired."
export const PARTNER_ID_REQUIRED = "Partner Id Cannot be empty"
export const EMAIL_REQUIRED = "Email can not be empty.";
export const EMAIL_VALIDATION = "Email should be a valid email.";
export const COUNTRYCODE_REQUIRED = "Country code cannot be empty.";
export const COUNTRYCODE_EXP = "Country code must start with '+' followed by digits.";
export const PHONENUMBER_REQUIRED = "Phone number cannot be empty.";
export const PHONENUMBER_EXP = "Phone number must contain only digits and be between 10-15 characters long.";
export const PASSWORD__REGEX = "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$";
export const PASSWORD_REQUIRED = "Password can not be empty.";
export const CONFIRM_PASSWORD_REQUIRED = "Confirm password cannot be empty.";
export const MATCH_CONFIRM_PASSWORD_REQUIRED = "Confirm password must match the password.";
export const PASSWPRD_LENGTH_VALIDATION = "Password must include atleast 8 characters.";
export const PASSWPRD_EXP = "Password must include at least 1 number, 1 uppercase letter, and 1 special character.";
export const OTP_REQUIRED = "OTP can not be empty.";
export const INVALID_EMAIL_FORMAT = "Invalid email format.";
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const VALIDATION_ERROR = "Validation Error";
export const POINT = "Point"
export const LOCATION_TYPE_REQUIRED = "Location type is required.";
export const INVALID_LOCATION_TYPE = 'Location type must be "Point"';
export const INVALID_COORDINATES = 'Invalid coordinates';
export const LONGITUDE_MIN_ERROR = 'Longitude must be greater than or equal to -180';
export const LONGITUDE_MAX_ERROR = 'Longitude must be less than or equal to 180';
export const LATITUDE_MIN_ERROR = 'Latitude must be greater than or equal to -90';
export const LATITUDE_MAX_ERROR = 'Latitude must be less than or equal to 90';
export const COORDINATES_LENGTH_ERROR = 'Coordinates must contain exactly 2 values [longitude, latitude]';
export const COORDINATES_REQUIRED_ERROR = 'Coordinates are required';
export const LOCATION_REQUIRED = "Location is required.";
export const ADDRESS_TYPE_ERROR = "Address must be a string.";
export const CATEGORY_ID_REQUIRED = "Category Id is required.";
export const saltRound = 10;
export const ADMIN = "Admin";
export const SERVICE_REQUEST_SUBJECT = "A new service request";
export const SERVICE_REQUEST_APPROVED = "Your service has been approved!";
export const SERVICE_REQUEST_DIS_APPROVED = "Your service has been dis-approved!";

export const imageExtensions = ['png', 'jpeg', 'jpg', 'webp', 'svg'];
export const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

export const fileExtensions = ['png', 'jpeg', 'jpg', 'webp', 'svg', 'docx', 'pdf'];
export const fileTypes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'application/pdf'
];

export const IN_ACTIVE = "InActive"
export const ADMIN_INACTIVE_MESSAGE = "Your account is inactive."
export const ACCOUNT_BLOCK_MESSAGE = "Your account has been blocked."
export const BLOCK_BY_PARTNER = "Blocked by Partner"
export const BLOCK_MESSAGE = "You have been blocked by the partner and can no longer access their services."
export const SERVICE_ACTIVE = "Service Activated"
export const SERVICE_INACTIVE = "Service Deactivated"
export const SERVICE_INACTIVE_MSG = "Your service has been deactivated by the admin. Please contact support for more information."
export const SERVICE_ACTIVE_MSG = "Your service has been activated by the admin. You can now start using the platform."
export const PARTNER = "Partner"
export const CUSTOMER = "Customer"