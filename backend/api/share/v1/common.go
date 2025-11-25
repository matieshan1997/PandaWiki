package v1

type FileUploadReq struct {
	KbId         string `form:"kb_id" json:"kb_id" validate:"required"`
	File         string `form:"file"`
	CaptchaToken string `form:"captcha_token" json:"captcha_token" validate:"required"`
}

type FileUploadResp struct {
	Key string `json:"key"`
}
