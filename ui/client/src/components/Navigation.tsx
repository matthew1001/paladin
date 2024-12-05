
import { Archive, Handshake } from '@mui/icons-material';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import RuleIcon from '@mui/icons-material/Rule';
import {
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

interface Props {
  navigationWidth: string;
  navigationVisible: boolean;
  setNavigationVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Navigation: React.FC<Props> = ({
  navigationWidth,
  navigationVisible,
  setNavigationVisible
}) => {
  const pathname = useLocation().pathname.toLowerCase();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleNavigation = (url: string) => {
    navigate(url);
    if (navigationVisible) {
      setNavigationVisible(false);
    }
  };

  const drawerContent = (
    <>
      <Box
        style={{
          marginTop: '30px',
          marginBottom: '20px',
          textAlign: 'center'
        }}
      >
        <Button className="main-logo" onClick={() => handleNavigation('/')}></Button>
      </Box>

    
      <List>
        <ListItem className="navigation">
          <ListItemText className="navigation title">{t('jobs')}</ListItemText>
        </ListItem>
        <ListItem className="navigation">
          <ListItemButton
            className="navigation"
            selected={pathname.startsWith('/pending-scenario-match-jobs')}
            onClick={() => handleNavigation('/pending-scenario-match-jobs')}
          >
            <ListItemIcon
              className={
                'navigation ' +
                (pathname.startsWith('/pending-scenario-match-jobs') ? 'selected' : undefined)
              }
            >
              <HourglassTopIcon fontSize="medium" />
            </ListItemIcon>
            <ListItemText>{t('pending')}</ListItemText>
          </ListItemButton>
        </ListItem>

        <ListItem className="navigation">
          <ListItemButton
            className="navigation"
            selected={pathname.startsWith('/incomplete-jobs')}
            onClick={() => handleNavigation('/incomplete-jobs')}
          >
            <ListItemIcon
              className={
                'navigation ' + (pathname.startsWith('/incomplete-jobs') ? 'selected' : undefined)
              }
            >
              <RuleIcon fontSize="medium" />
            </ListItemIcon>
            <ListItemText>{t('Incomplete')}</ListItemText>
          </ListItemButton>
        </ListItem>

        <ListItem className="navigation">
          <ListItemButton
            className="navigation"
            selected={pathname.startsWith('/pending-match-operator-events')}
            onClick={() => handleNavigation('/pending-match-operator-events')}
          >
            <ListItemIcon
              className={
                'navigation ' +
                (pathname.startsWith('/pending-match-operator-events') ? 'selected' : undefined)
              }
            >
              <HourglassTopIcon fontSize="medium" />
            </ListItemIcon>
            <ListItemText>{t('pending')}</ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem className="navigation">
          <ListItemButton
            className="navigation"
            selected={pathname.startsWith('/matched-operator-events')}
            onClick={() => handleNavigation('/matched-operator-events')}
          >
            <ListItemIcon
              className={
                'navigation ' +
                (pathname.startsWith('/matched-operator-events') ? 'selected' : undefined)
              }
            >
              <Handshake fontSize="medium" />
            </ListItemIcon>
            <ListItemText>{t('matched')}</ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem className="navigation">
          <ListItemButton
            className="navigation"
            selected={pathname.startsWith('/rejected-operator-events')}
            onClick={() => handleNavigation('/rejected-operator-events')}
          >
            <ListItemIcon
              className={
                'navigation ' +
                (pathname.startsWith('/rejected-operator-events') ? 'selected' : undefined)
              }
            >
              <HighlightOffIcon fontSize="medium" />
            </ListItemIcon>
            <ListItemText>{t('rejected')}</ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem className="navigation">
          <ListItemButton
            className="navigation"
            selected={pathname.startsWith('/archived-operator-events')}
            onClick={() => handleNavigation('/archived-operator-events')}
          >
            <ListItemIcon
              className={
                'navigation ' +
                (pathname.startsWith('/archived-operator-events') ? 'selected' : undefined)
              }
            >
              <Archive fontSize="medium" />
            </ListItemIcon>
            <ListItemText>{t('archived')}</ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem className="navigation">
          <ListItemText className="navigation title">{t('auxiliaryData')}</ListItemText>
        </ListItem>
        
        
        
        {/* <List disablePadding>
          <ListItem className="navigation">
            <ListItemButton
              className="navigation"
              selected={pathname.startsWith('/locations')}
              onClick={() => handleNavigation('/locations')}
            >
              <ListItemIcon
                className={
                  'navigation ' + (pathname.startsWith('/locations') ? 'selected' : undefined)
                }
              >
                <PinDropOutlinedIcon fontSize="medium" />
              </ListItemIcon>
              <ListItemText>{t('locations')}</ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem className="navigation">
            <ListItemButton
              className="navigation"
              selected={pathname.startsWith('/projects')}
              onClick={() => handleNavigation('/projects')}
            >
              <ListItemIcon
                className={
                  'navigation ' + (pathname.startsWith('/projects') ? 'selected' : undefined)
                }
              >
                <FolderOpenOutlinedIcon fontSize="medium" />
              </ListItemIcon>
              <ListItemText>{t('projects')}</ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem className="navigation">
            <ListItemButton
              className="navigation"
              selected={pathname.startsWith('/project-type-phase-accounting')}
              onClick={() => handleNavigation('/project-type-phase-accounting')}
            >
              <ListItemIcon
                className={
                  'navigation ' +
                  (pathname.startsWith('/project-type-phase-accounting') ? 'selected' : undefined)
                }
              >
                <FormatListBulletedIcon fontSize="medium" />
              </ListItemIcon>
              <ListItemText>{t('accounting')}</ListItemText>
            </ListItemButton>
          </ListItem>
        </List> */}

        
      </List>
      <Box sx={{ height: '100%' }} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '15px'
        }}
      >
        <img src={`/img/b4e/powered-by.svg`} alt="" />
      </Box>
    </>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={navigationVisible}
        sx={{
          display: { sm: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: navigationWidth }
        }}
        onClose={() => setNavigationVisible(false)}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { sm: 'block', xs: 'none' },
          '& .MuiDrawer-paper': { width: navigationWidth }
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
