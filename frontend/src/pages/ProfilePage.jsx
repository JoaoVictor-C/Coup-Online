import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile } from '../store/actions/authActions';
import '../assets/styles/ProfilePage.css'; // Import the ProfilePage styles

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      dispatch(getProfile());
    }
  }, [dispatch, user]);

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!user) return <p>No user data available.</p>;

  return (
    <div className="profile-container py-5">
      <div className="profile-card shadow">
        <h2 className="mb-4">Profile</h2>
        <div className="profile-details">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;