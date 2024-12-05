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

import { Box, Fade, Typography } from "@mui/material";
import { t } from "i18next";
import { ABIComponent } from "../components/ABI";

export const ABI: React.FC = () => {
  return (
    <Fade timeout={600} in={true}>
      <Box
        sx={{
          padding: "30px",
          maxWidth: "1300px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <Typography align="center" variant="h5" sx={{ marginBottom: '20px' }}>
          {t("ABI")}
        </Typography>
        <ABIComponent />
      </Box>
    </Fade>
  );
}
