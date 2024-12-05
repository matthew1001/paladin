// Copyright © 2024 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Paper, Grid2, TextField, MenuItem, Typography, IconButton, Tooltip, Button } from "@mui/material";
import { t } from "i18next";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useState } from "react";
import { Buffer } from 'buffer';

export const ABIComponent: React.FC = () => {

  const [domain, setDomain] = useState('');
  const [from, setFrom] = useState('');
  const [evmVersion, setEVMVersion] = useState('');
  const [externalCallsEnabled, setExternalCallsEnabled] = useState('');
  const [salt, setSalt] = useState('');
  const [members, setMembers] = useState<string>('');
  const [abi, setAbi] = useState('');

  const generateSalt = () => {
    let randomBytes = new Uint8Array(32);
    randomBytes = window.crypto.getRandomValues(randomBytes);
    setSalt('0x' + Buffer.from(randomBytes).toString('hex'));
  };

  return (
    <>
      <form>
        <Paper sx={{ padding: '20px' }}>
          <Typography variant="h6" align="left" sx={{ marginBottom: '20px' }}>{t('privacyGroup')}</Typography>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('domain')}
                value={domain}
                onChange={event => setDomain(event.target.value)}
                fullWidth
                required
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('from')}
                value={from}
                onChange={event => setFrom(event.target.value)}
                fullWidth
                required
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label={t('evmVersion')}
                value={evmVersion}
                fullWidth
                required
                onChange={event => setEVMVersion(event.target.value)}
              >
                <MenuItem value="arrowGlacier">Arrow Glacier</MenuItem>
                <MenuItem value="berlin">Berlin</MenuItem>
                <MenuItem value="byzantium">Byzantium</MenuItem>
                <MenuItem value="cancun">Cancun</MenuItem>
                <MenuItem value="constantinople">Constantinople / Petersburg</MenuItem>
                <MenuItem value="grayGlacier">Gray Glacier</MenuItem>
                <MenuItem value="homestead">Homestead</MenuItem>
                <MenuItem value="istanbul">Istanbul</MenuItem>
                <MenuItem value="london">London</MenuItem>
                <MenuItem value="paris">Paris</MenuItem>
                <MenuItem value="shanghai">Shanghai</MenuItem>
                <MenuItem value="spuriousDragon">Spurious Dragon</MenuItem>
                <MenuItem value="tangerineWhistle">Tangerine Whistle</MenuItem>
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label={t('externalCalls')}
                fullWidth
                required
                value={externalCallsEnabled}
                onChange={event => setExternalCallsEnabled(event.target.value)}
              >
                <MenuItem value="enabled">{t('enabled')}</MenuItem>
                <MenuItem value="disabled">{t('disabled')}</MenuItem>
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 12 }} container alignItems="center" wrap="nowrap">
              <TextField
                label={t('salt')}
                fullWidth
                required
                value={salt}
                onChange={event => setSalt(event.target.value)}
                slotProps={{
                  input: {
                    endAdornment:
                      <Tooltip arrow title={t('generate')}>
                        <IconButton onClick={() => generateSalt()}>
                          <AutoFixHighIcon />
                        </IconButton>
                      </Tooltip>
                  }
                }}

              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <TextField
                label={t('membersCommaSeparated')}
                fullWidth
                required
                value={members}
                onChange={event => setMembers(event.target.value)}
              />
            </Grid2>
            <Grid2>
              <Typography variant="h6" align="left" sx={{ marginTop: '10px' }}>{t('abi')}</Typography>
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                value={abi}
                onChange={event => setAbi(event.target.value)}
                rows={8}
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }} textAlign="center">
              <Button
              size="large"
              variant="contained"
              disableElevation
              
              >
                {t('submit')}
              </Button>
            </Grid2>
          </Grid2>
        </Paper>
      </form>
    </>
  );

};