export const SUCCESS = {
    message: "Success.",
    details: "The operation was completed successfully."
};
export const OTP_RESENT = {
    message: "OTP Resent.",
    details: "The OTP has been resent to your email address. Please check your inbox."
};
export const MAIL_SENT_WITH_OTP = {
    message: "Mail Sent.",
    details: "An email with the OTP has been sent to your inbox."
};
export const REGISTRATION_SUCCESSFULL = {
    message: "Registration successful!",
    details: "Registration successful! Please check your email for OTP verification."
};
export const USER_NOT_FOUND = {
    message: "User Not Found.",
    details: "The user could not be found. Please check the entered information and try again."
};
export const ACCOUNT_BLOCKED = {
    message: "Account Blocked.",
    details: "Your account is temporarily blocked due to multiple failed attempts. Please try again later."
};
export const OTP_REQUIRED = {
    message: "OTP Required.",
    details: "Please enter the OTP sent to your email to proceed."
};
export const ACCOUNT_AND_IP_BLOCKED = {
    message: "Account and IP Blocked.",
    details: "Your account and IP are temporarily blocked due to multiple failed attempts. Please try again later."
};
export const INVALID_OTP = {
    message: "Invalid OTP.",
    details: "The OTP you entered is invalid. Please check and try again."
};
export const OTP_EXPIRED = {
    message: "OTP Expired.",
    details: "The OTP has expired. Please request a new one to continue."
};
export const OTP_VERIFIED = {
    message: "OTP Verified.",
    details: "The OTP has been successfully verified."
};
export const USER_NOT_EXIST = {
    message: "User Not Found.",
    details: "The user does not exist. Please check the information and try again."
};
export const INVALID_PASSWORD = {
    message: "Invalid Password.",
    details: "The password you entered is incorrect. Please try again."
};
export const INVALID_LOGIN = {
    message: "Invalid Login.",
    details: "The login credentials are incorrect. Please check your username and password and try again."
};
export const LINK_EXPIRED = {
    message: "Link Expired.",
    details: "The link you used has expired. Please request a new one to proceed."
};
export const INTERNAL_SERVER_ERROR = {
    message: "Internal server error.",
    details: "An unexpected error occurred. Please try again later.",
};
export const PASSWORD_CHANGED_SUCCESSFULLY = {
    message: "Password changed successfully.",
    details: "Your password has been updated. Please use the new password for future logins."
};
export const USER_CANNOT_BE_FOUND = {
    message: "User cannot be found.",
    details: "No account is associated with the provided email address.",
};
export const INVALID_LOCATION_TYPE = {
    message: "Invalid location type.",
    details: "The location type must be 'point'."
};
export const INVALID_COORDINATES = {
    message: "Invalid GPS coordinates.",
    details: "The coordinates must include valid latitude and longitude as numbers and must be an array with exactly 2 values (latitude and longitude)."
};
export const LOCATION_VALIDATION_SUCCESS = {
    message: "Location saved successfully.",
    details: "The location data has been validated and saved."
};
export const TOKEN_REQUIRED = {
    message: "Token is required.",
    details: "Please provide a valid token to proceed.",
};
export const LOGIN_SUCCESSFUL = {
    message: "Login successful.",
    details: "Welcome back! You have successfully logged in.",
};
export const TOKEN_VERIFICATION_FAILED = {
    message: "Token verification failed.",
    details: "The provided token is invalid or expired. Please authenticate again.",
};
export const NO_RECORD_FOUND = {
    message: "No record found.",
    details: "No record found."
};
export const ACCOUNT_DELETED_SUCCESS = {
    message: "Account Deleted Successfully.",
    details: "The user account has been permanently removed from the system."
};
export const CATEGORY_EXISTS = {
    message: "Category Already Exists.",
    details: "The category you are trying to create already exists. Please use a different name."
};
export const FETCH_LISTING_SUCCESS = {
    message: "Listing fetched successfully.",
    details: "The listing data has been retrieved successfully.",
};

export const EMAIL_EXIST = {
  message: "Email already exists.",
  details: "Partner with this email already exists.",
};

export const CATEGORY_SUCCESS_MESSAGES = {
    CATEGORY_DELETED: {
      message: "Category deleted successfully.",
      details: "The selected category has been marked as deleted.",
    },
    CATEGORY_UPDATED: {
      message: "Category updated successfully.",
      details: "The category details have been updated.",
    },
  };
  
  export const CATEGORY_ERROR_MESSAGES = {
    CATEGORY_NOT_EXIST: {
      message: "Category does not exist.",
      details: "The requested category was not found or has already been deleted.",
    },
    INVALID_ID: {
      message: "Invalid category ID.",
      details: "The provided category ID is not a valid ObjectId.",
    },
    CATEGORY_EXISTS: {
      message: "Category already exists.",
      details: "A category with this name already exists. Please choose a different name.",
    },
  };
  
  export const SUBCATEGORY_ERROR_MESSAGES = {
    CATEGORY_NOT_FOUND: {
      message: "Subcategory not found.",
      details: "The parent category does not exist or has been deleted.",
    },
    INVALID_CATEGORY_ID: {
      message: "Invalid subcategory ID.",
      details: "The provided category ID is not valid.",
    },
    SUBCATEGORY_EXISTS: {
      message: "Subcategory already exists.",
      details: "A subcategory with this name already exists under this category.",
    },
    INVALID_SUBCATEGORY_ID: {
        message: "Invalid subcategory ID.",
        details: "The provided subcategory ID is not valid.",
      }
  };
  export const SUBCATEGORY_MESSAGES = {
    SUBCATEGORY_ADDED: {
        message: "Subcategory added successfully.",
        details: "The new subcategory has been created and linked to its parent category.",
      },
    SUBCATEGORY_NOT_FOUND: {
      message: "Subcategory not found.",
      details: "The requested subcategory does not exist.",
    },
    SUBCATEGORY_EXISTS: {
      message: "Subcategory already exists.",
      details: "A subcategory with the same name already exists.",
    },
    SUBCATEGORY_CREATED: {
      message: "Subcategory created successfully.",
      details: "The new subcategory has been added successfully.",
    },
    SUBCATEGORY_UPDATED: {
      message: "Subcategory updated successfully.",
      details: "The subcategory details have been updated successfully.",
    },
    SUBCATEGORY_DELETED: {
      message: "Subcategory deleted successfully.",
      details: "The subcategory has been marked as deleted.",
    }
  };  
  
  export const PARTNER_NOT_EXIST = {
    message: "Partner Not Found.",
    details: "The partner does not exist. Please check the information and try again."
};