package main

import (
	"fmt"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

type Tab struct {
	title   string
	content fyne.CanvasObject
}

func main() {
	a := app.New()
	w := a.NewWindow("Custom Tabs")
	w.Resize(fyne.NewSize(720, 450))

	var tabs []Tab
	active := 0

	tabBar := container.NewHBox()
	contentArea := container.NewMax()

	var render func()

	render = func() {
		tabBar.Objects = nil

		// -------- Render tabs --------
		for i := range tabs {
			index := i

			// Tab title button
			titleBtn := widget.NewButton(tabs[i].title, func() {
				active = index
				render()
			})
			titleBtn.Importance = widget.LowImportance

			// Close button
			closeBtn := widget.NewButtonWithIcon("", theme.CancelIcon(), func() {

				if len(tabs) == 1 {
					a.Quit()
					return
				}
				tabs = append(tabs[:index], tabs[index+1:]...)
				if active >= len(tabs) {
					active = len(tabs) - 1
				}
				render()
			})
			closeBtn.Importance = widget.LowImportance

			tabBar.Add(container.NewHBox(titleBtn, closeBtn))
		}

		// -------- "+" button (NO close) --------
		addBtn := widget.NewButton("+", func() {
			tabs = append(tabs, Tab{
				title:   fmt.Sprintf("Tab %d", len(tabs)+1),
				content: widget.NewLabel("New Tab Content"),
			})
			active = len(tabs) - 1
			render()
		})
		tabBar.Add(addBtn)

		// -------- Content --------
		if len(tabs) > 0 && active >= 0 {
			contentArea.Objects = []fyne.CanvasObject{
				container.NewPadded(tabs[active].content),
			}
		} else {
			contentArea.Objects = nil
		}

		tabBar.Refresh()
		contentArea.Refresh()
	}

	// Initial tab
	tabs = append(tabs, Tab{
		title:   "Tab 1",
		content: widget.NewLabel("Content of Tab 1"),
	})

	render()

	w.SetContent(container.NewBorder(tabBar, nil, nil, nil, contentArea))
	w.ShowAndRun()
}
