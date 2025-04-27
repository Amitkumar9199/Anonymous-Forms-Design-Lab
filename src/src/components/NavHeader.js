import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Create a styled component for the user information section
const UserInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
  '& .MuiAvatar-root': {
    width: 32,
    height: 32,
    marginLeft: theme.spacing(1),
    backgroundColor: theme.palette.primary.dark
  }
}));

const NavHeader = ({ title }) => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleClose();
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title || 'Anonymous Portal'}
        </Typography>
        
        {!isAdmin && (
          <>
            <Button 
              color="inherit" 
              onClick={() => handleNavigate('/submit')}
              sx={{ mr: 1 }}
            >
              Submit
            </Button>
            <Button 
              color="inherit" 
              onClick={() => handleNavigate('/responses')}
              sx={{ mr: 1 }}
            >
              Responses
            </Button>
            <Button 
              color="inherit" 
              onClick={() => handleNavigate('/verify')}
              sx={{ mr: 2 }}
            >
              Verify
            </Button>
          </>
        )}
        
        {isAdmin && (
          <Button 
            color="inherit" 
            onClick={() => handleNavigate('/admin')}
            sx={{ mr: 2 }}
          >
            Admin Dashboard
          </Button>
        )}
        
        {user && (
          <UserInfo>
            <Typography variant="body1" sx={{ mr: 1 }}>
              {user.name}
            </Typography>
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              size="small"
            >
              <Avatar>{getInitials(user.name)}</Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="textSecondary">
                  Signed in as {user.email}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </UserInfo>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavHeader; 