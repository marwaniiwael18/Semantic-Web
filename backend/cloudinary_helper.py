"""
Cloudinary Image Upload Helper
Handles profile image uploads to Cloudinary
"""

import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

def upload_profile_image(image_data, user_id):
    """
    Upload a profile image to Cloudinary
    
    Args:
        image_data: Base64 encoded image data or file path
        user_id: User ID for unique naming
        
    Returns:
        dict: Contains 'url' and 'public_id' on success, or 'error' on failure
    """
    try:
        # Upload image to Cloudinary
        result = cloudinary.uploader.upload(
            image_data,
            folder="smart_city_profiles",
            public_id=f"user_{user_id}",
            overwrite=True,
            resource_type="image",
            transformation=[
                {'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
        )
        
        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id')
        }
    except Exception as e:
        return {'error': str(e)}

def delete_profile_image(public_id):
    """
    Delete a profile image from Cloudinary
    
    Args:
        public_id: The Cloudinary public ID of the image
        
    Returns:
        dict: Result of deletion
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result
    except Exception as e:
        return {'error': str(e)}

def upload_station_image(image_data, station_id):
    """
    Upload a station image to Cloudinary
    
    Args:
        image_data: Base64 encoded image data or file path
        station_id: Station ID for unique naming
        
    Returns:
        dict: Contains 'url' and 'public_id' on success, or 'error' on failure
    """
    try:
        result = cloudinary.uploader.upload(
            image_data,
            folder="smart_city_stations",
            public_id=f"station_{station_id}",
            overwrite=True,
            resource_type="image",
            transformation=[
                {'width': 800, 'height': 600, 'crop': 'fill'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
        )
        
        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id')
        }
    except Exception as e:
        return {'error': str(e)}
