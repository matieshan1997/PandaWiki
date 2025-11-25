package share

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareSitemapHandler struct {
	*handler.BaseHandler
	sitemapUsecase *usecase.SitemapUsecase
	appUsecase     *usecase.AppUsecase
	logger         *log.Logger
}

func NewShareSitemapHandler(echo *echo.Echo, baseHandler *handler.BaseHandler, sitemapUsecase *usecase.SitemapUsecase, appUsecase *usecase.AppUsecase, logger *log.Logger) *ShareSitemapHandler {
	h := &ShareSitemapHandler{
		BaseHandler:    baseHandler,
		sitemapUsecase: sitemapUsecase,
		appUsecase:     appUsecase,
		logger:         logger.WithModule("handler.share.sitemap"),
	}

	group := echo.Group("/sitemap.xml")
	group.GET("", h.GetSitemap)

	return h
}

func (h *ShareSitemapHandler) GetSitemap(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	appInfo, err := h.appUsecase.ShareGetWebAppInfo(c.Request().Context(), kbID, domain.GetAuthID(c))
	if err != nil {
		return h.NewResponseWithError(c, "web app not found", err)
	}
	if !appInfo.Settings.AutoSitemap {
		return h.NewResponseWithError(c, "未开启自动生成站点地图功能", nil)
	}

	xml, err := h.sitemapUsecase.GetSitemap(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to generate sitemap", err)
	}

	return c.Blob(http.StatusOK, echo.MIMEApplicationXMLCharsetUTF8, []byte(xml))
}
